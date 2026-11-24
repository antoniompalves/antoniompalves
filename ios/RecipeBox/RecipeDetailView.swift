import SwiftUI

struct RecipeDetailView: View {
    @EnvironmentObject var library: Library
    @Environment(\.dismiss) private var dismiss
    @State var recipe: Recipe
    @State private var servings: Int = 0
    @State private var checked: Set<Int> = []
    @State private var cookMode = false
    @State private var editingCollections = false

    var body: some View {
        List {
            Section {
                AsyncImage(url: recipe.thumbnail_url.flatMap(URL.init)) { $0.resizable().scaledToFill() }
                    placeholder: { Color.secondary.opacity(0.1) }
                    .frame(height: 240).clipped().listRowInsets(EdgeInsets())
                VStack(alignment: .leading, spacing: 8) {
                    Text(recipe.title).font(.title2.bold())
                    if let d = recipe.description { Text(d).foregroundStyle(.secondary) }
                    HStack(spacing: 16) {
                        if let p = recipe.prep_minutes { Label("Prep \(p)m", systemImage: "timer") }
                        if let c = recipe.cook_minutes { Label("Cook \(c)m", systemImage: "flame") }
                        if let kcal = recipe.nutrition_estimate?.calories { Label("\(kcal) kcal", systemImage: "bolt") }
                    }.font(.footnote).foregroundStyle(.secondary)
                    if let url = URL(string: recipe.source_url) {
                        Link(destination: url) {
                            Label("From \(recipe.author ?? recipe.source_platform.capitalized)",
                                  systemImage: "arrow.up.right.square")
                        }.font(.footnote)
                    }
                    if recipe.confidence < 0.7 {
                        Label("Some details were estimated (\(recipe.inferred_fields.joined(separator: ", "))). Double-check before cooking.",
                              systemImage: "wand.and.stars")
                            .font(.footnote).foregroundStyle(.orange)
                    }
                }
            }

            Section {
                if recipe.servings != nil {
                    Stepper("Servings: \(servings)", value: $servings, in: 1...50)
                        .onChange(of: servings) { _, n in Task { await rescale(to: n) } }
                }
                ForEach(groupedIngredients, id: \.0) { group, items in
                    if let group { Text(group).font(.subheadline.bold()) }
                    ForEach(items, id: \.offset) { idx, ing in
                        Button { toggle(idx) } label: {
                            HStack {
                                Image(systemName: checked.contains(idx) ? "checkmark.circle.fill" : "circle")
                                Text(ing.display).strikethrough(checked.contains(idx))
                            }
                        }.buttonStyle(.plain)
                    }
                }
            } header: { Text("Ingredients") }

            Section("Steps") {
                ForEach(Array(recipe.steps.enumerated()), id: \.offset) { i, s in
                    HStack(alignment: .top, spacing: 12) {
                        Text("\(i + 1)").font(.headline).frame(width: 24)
                        Text(s.text)
                    }
                }
            }

            if !recipe.tags.isEmpty {
                Section("Tags") { Text(recipe.tags.map { "#\($0)" }.joined(separator: "  ")).foregroundStyle(.secondary) }
            }
        }
        .listStyle(.insetGrouped)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            Button { Task { await library.toggleFavorite(recipe); recipe.favorite.toggle() } } label: {
                Image(systemName: recipe.favorite ? "heart.fill" : "heart")
            }
            Menu {
                Button("Cook mode", systemImage: "play.circle") { cookMode = true }
                Button("Add to grocery list", systemImage: "cart.badge.plus") { library.groceryIDs.insert(recipe.id) }
                Button("Collections…", systemImage: "folder") { editingCollections = true }
                ShareLink(item: URL(string: recipe.source_url) ?? URL(string: "https://example.com")!)
                Button("Delete", systemImage: "trash", role: .destructive) {
                    Task { await library.delete(recipe); dismiss() }
                }
            } label: { Image(systemName: "ellipsis.circle") }
        }
        .fullScreenCover(isPresented: $cookMode) { CookModeView(recipe: recipe) }
        .sheet(isPresented: $editingCollections) { CollectionsEditor(recipe: $recipe) }
        .onAppear { servings = recipe.servings ?? 0 }
    }

    private var groupedIngredients: [(String?, [(offset: Int, element: Ingredient)])] {
        var order: [String?] = []
        var map: [String?: [(offset: Int, element: Ingredient)]] = [:]
        for item in recipe.ingredients.enumerated() {
            if map[item.element.group] == nil { order.append(item.element.group) }
            map[item.element.group, default: []].append(item)
        }
        return order.map { ($0, map[$0]!) }
    }

    private func toggle(_ i: Int) { if checked.contains(i) { checked.remove(i) } else { checked.insert(i) } }

    private func rescale(to n: Int) async {
        guard n != recipe.servings, let scaled = try? await APIClient().recipe(recipe.id, servings: n) else { return }
        recipe.ingredients = scaled.ingredients
        recipe.servings = n
    }
}

/// Large-type, one-step-at-a-time view that keeps the screen awake.
struct CookModeView: View {
    let recipe: Recipe
    @Environment(\.dismiss) private var dismiss
    @State private var index = 0

    var body: some View {
        NavigationStack {
            TabView(selection: $index) {
                ForEach(Array(recipe.steps.enumerated()), id: \.offset) { i, s in
                    VStack(spacing: 24) {
                        Text("Step \(i + 1) of \(recipe.steps.count)").font(.headline).foregroundStyle(.secondary)
                        Text(s.text).font(.title).multilineTextAlignment(.center).padding()
                    }.tag(i)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .always))
            .toolbar { Button("Done") { dismiss() } }
            .navigationTitle(recipe.title).navigationBarTitleDisplayMode(.inline)
        }
        .onAppear { UIApplication.shared.isIdleTimerDisabled = true }
        .onDisappear { UIApplication.shared.isIdleTimerDisabled = false }
    }
}

struct CollectionsEditor: View {
    @EnvironmentObject var library: Library
    @Environment(\.dismiss) private var dismiss
    @Binding var recipe: Recipe
    @State private var newName = ""

    var body: some View {
        NavigationStack {
            List {
                ForEach(Array(Set(library.collections + recipe.collections)).sorted(), id: \.self) { c in
                    Button { toggle(c) } label: {
                        HStack { Text(c); Spacer(); if recipe.collections.contains(c) { Image(systemName: "checkmark") } }
                    }
                }
                HStack {
                    TextField("New collection", text: $newName)
                    Button("Add") { toggle(newName); newName = "" }.disabled(newName.isEmpty)
                }
            }
            .navigationTitle("Collections")
            .toolbar { Button("Done") { Task { await library.setCollections(recipe, recipe.collections) }; dismiss() } }
        }
    }

    private func toggle(_ c: String) {
        if let i = recipe.collections.firstIndex(of: c) { recipe.collections.remove(at: i) } else { recipe.collections.append(c) }
    }
}
