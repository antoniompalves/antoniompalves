import SwiftUI

@main
struct RecipeBoxApp: App {
    @StateObject private var library = Library()

    var body: some Scene {
        WindowGroup {
            TabView {
                LibraryView().tabItem { Label("Recipes", systemImage: "book") }
                GroceryView().tabItem { Label("Groceries", systemImage: "cart") }
                SettingsView().tabItem { Label("Settings", systemImage: "gear") }
            }
            .environmentObject(library)
            .task { await library.refresh() }
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
                Task { await library.resumePendingImports() }
            }
        }
    }
}

@MainActor
final class Library: ObservableObject {
    @Published var recipes: [Recipe] = []
    @Published var importing: [String: String] = [:]   // job id -> status label
    @Published var error: String?
    @Published var groceryIDs: Set<String> = []
    private let api = APIClient()

    var collections: [String] { Array(Set(recipes.flatMap(\.collections))).sorted() }

    func refresh(query: String? = nil) async {
        do { recipes = try await APIClient().recipes(query: query) }
        catch { self.error = error.localizedDescription }
    }

    func importURL(_ url: String) async {
        do {
            let job = try await APIClient().startImport(url: url)
            await track(job.id)
        } catch { self.error = error.localizedDescription }
    }

    func importText(_ text: String) async {
        do {
            let job = try await APIClient().startImport(text: text)
            await track(job.id)
        } catch { self.error = error.localizedDescription }
    }

    /// Picks up jobs started from the share extension while the app was closed.
    func resumePendingImports() async {
        let ids = Settings.pendingJobs
        Settings.pendingJobs = []
        await withTaskGroup(of: Void.self) { g in
            for id in ids { g.addTask { await self.track(id) } }
        }
    }

    private func track(_ jobID: String) async {
        importing[jobID] = "Importing…"
        defer { importing[jobID] = nil }
        do {
            _ = try await APIClient().waitForImport(jobID)
            await refresh()
        } catch { self.error = error.localizedDescription }
    }

    func toggleFavorite(_ r: Recipe) async {
        if let updated = try? await api.update(r.id, fields: ["favorite": AnyEncodable(!r.favorite)]) {
            replace(updated)
        }
    }

    func setCollections(_ r: Recipe, _ cols: [String]) async {
        if let updated = try? await api.update(r.id, fields: ["collections": AnyEncodable(cols)]) {
            replace(updated)
        }
    }

    func delete(_ r: Recipe) async {
        try? await api.delete(r.id)
        recipes.removeAll { $0.id == r.id }
    }

    private func replace(_ r: Recipe) {
        if let i = recipes.firstIndex(where: { $0.id == r.id }) { recipes[i] = r }
    }
}
