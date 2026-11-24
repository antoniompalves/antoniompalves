import SwiftUI
import UIKit
import UniformTypeIdentifiers

/// Appears in the iOS share sheet of TikTok / Instagram / YouTube / Safari / Pinterest.
/// Grabs the shared URL (or caption text), queues an import job on the backend, and
/// dismisses immediately; the main app shows the result when it's ready.
final class ShareViewController: UIViewController {
    private let model = ShareModel()

    override func viewDidLoad() {
        super.viewDidLoad()
        let host = UIHostingController(rootView: ShareView(model: model) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil)
        })
        addChild(host)
        host.view.frame = view.bounds
        host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(host.view)
        host.didMove(toParent: self)
        Task { await handleInput() }
    }

    private func handleInput() async {
        let items = (extensionContext?.inputItems as? [NSExtensionItem]) ?? []
        let providers = items.flatMap { $0.attachments ?? [] }
        var url: String?
        var text: String?
        for p in providers {
            if url == nil, p.hasItemConformingToTypeIdentifier(UTType.url.identifier),
               let u = try? await p.loadItem(forTypeIdentifier: UTType.url.identifier) as? URL {
                url = u.absoluteString
            } else if text == nil, p.hasItemConformingToTypeIdentifier(UTType.plainText.identifier),
                      let t = try? await p.loadItem(forTypeIdentifier: UTType.plainText.identifier) as? String {
                text = t
            }
        }
        // Many apps share "Check this out! https://vm.tiktok.com/xyz" as plain text.
        if url == nil, let t = text,
           let match = t.firstMatch(of: /https?:\/\/\S+/) {
            url = String(match.output)
        }
        await model.submit(url: url, text: url == nil ? text : nil)
    }
}

@MainActor
final class ShareModel: ObservableObject {
    enum State { case sending, queued, failed(String) }
    @Published var state: State = .sending

    func submit(url: String?, text: String?) async {
        guard url != nil || text != nil else { state = .failed("Nothing to import"); return }
        do {
            let job = try await APIClient().startImport(url: url, text: text)
            Settings.pendingJobs.append(job.id)
            state = .queued
        } catch {
            state = .failed(error.localizedDescription)
        }
    }
}

struct ShareView: View {
    @ObservedObject var model: ShareModel
    let done: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            switch model.state {
            case .sending:
                ProgressView("Saving recipe…")
            case .queued:
                Image(systemName: "checkmark.circle.fill").font(.system(size: 48)).foregroundStyle(.green)
                Text("Saved! We're turning it into a recipe.").multilineTextAlignment(.center)
            case .failed(let msg):
                Image(systemName: "exclamationmark.triangle.fill").font(.system(size: 48)).foregroundStyle(.orange)
                Text(msg).multilineTextAlignment(.center)
            }
            Button("Done", action: done).buttonStyle(.borderedProminent)
        }
        .padding(32)
        .task(id: String(describing: model.state)) {
            if case .queued = model.state {
                try? await Task.sleep(for: .seconds(1.2))
                done()
            }
        }
    }
}
