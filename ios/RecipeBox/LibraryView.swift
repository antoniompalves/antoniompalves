import SwiftUI

struct LibraryView: View {
    @EnvironmentObject var library: Library
    @State private var search = ""
    @State private var collection: String?
    @State private var showImport = false

    private var filtered: [Recipe] {
        library.recipes.filter { collection == nil || $0.collections.contains(collection!) }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                if !library.collections.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            chip("All", selected: collection == nil) { collection = nil }
                            ForEach(library.collections, id: \.self) { c in
                                chip(c, selected: collection == c) { collection = c }
                            }
                        }.padding(.horizontal)
                    }
                }
                ForEach(Array(library.importing.values.enumerated()), id: \.offset) { _, status in
                    HStack { ProgressView(); Text(status).foregroundStyle(.secondary) }
                        .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal)
                }
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: 12)], spacing: 12) {
                    ForEach(filtered) { r in
                        NavigationLink(value: r) { RecipeCard(recipe: r) }.buttonStyle(.plain)
                    }
                }
                .padding()
                if library.recipes.isEmpty && library.importing.isEmpty {
                    ContentUnavailableView("No recipes yet",
                        systemImage: "square.and.arrow.down",
                        description: Text("Share a TikTok, Reel, YouTube video or recipe link to Gohan, or tap +."))
                }
            }
            .navigationTitle("Recipes")
            .navigationDestination(for: Recipe.self) { RecipeDetailView(recipe: $0) }
            .searchable(text: $search, prompt: "Search recipes or ingredients")
            .onSubmit(of: .search) { Task { await library.refresh(query: search) } }
            .onChange(of: search) { _, new in if new.isEmpty { Task { await library.refresh() } } }
            .refreshable { await library.refresh(query: search) }
            .toolbar { Button { showImport = true } label: { Image(systemName: "plus") } }
            .sheet(isPresented: $showImport) { ImportSheet() }
            .alert("Error", isPresented: .constant(library.error != nil)) {
                Button("OK") { library.error = nil }
            } message: { Text(library.error ?? "") }
        }
    }

    private func chip(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(title, action: action)
            .padding(.horizontal, 12).padding(.vertical, 6)
            .background(selected ? Color.accentColor : Color.secondary.opacity(0.15), in: Capsule())
            .foregroundStyle(selected ? .white : .primary)
    }
}

struct RecipeCard: View {
    let recipe: Recipe
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            AsyncImage(url: recipe.thumbnail_url.flatMap(URL.init)) { img in
                img.resizable().scaledToFill()
            } placeholder: {
                Rectangle().fill(.quaternary).overlay(Image(systemName: "fork.knife").foregroundStyle(.secondary))
            }
            .frame(height: 180).clipped().clipShape(RoundedRectangle(cornerRadius: 12))
            Text(recipe.title).font(.headline).lineLimit(2)
            HStack(spacing: 6) {
                PlatformBadge(platform: recipe.source_platform)
                if let t = recipe.total_minutes { Label("\(t)m", systemImage: "clock") }
                if recipe.favorite { Image(systemName: "heart.fill").foregroundStyle(.pink) }
            }.font(.caption).foregroundStyle(.secondary)
        }
    }
}

struct PlatformBadge: View {
    let platform: String
    var body: some View {
        Text(platform.capitalized)
            .padding(.horizontal, 6).padding(.vertical, 2)
            .background(.secondary.opacity(0.15), in: Capsule())
    }
}

struct ImportSheet: View {
    @EnvironmentObject var library: Library
    @Environment(\.dismiss) private var dismiss
    @State private var link = ""
    @State private var text = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Paste a link") {
                    TextField("TikTok, Instagram, YouTube, Pinterest or blog URL", text: $link)
                        .keyboardType(.URL).textInputAutocapitalization(.never)
                    PasteButton(payloadType: String.self) { link = $0.first ?? "" }
                }
                Section("…or paste a caption / recipe text") {
                    TextEditor(text: $text).frame(minHeight: 120)
                }
            }
            .navigationTitle("Import recipe")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Import") {
                        let l = link, t = text
                        Task { l.isEmpty ? await library.importText(t) : await library.importURL(l) }
                        dismiss()
                    }.disabled(link.isEmpty && text.isEmpty)
                }
            }
        }
    }
}
