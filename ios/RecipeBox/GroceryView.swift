import SwiftUI

struct GroceryView: View {
    @EnvironmentObject var library: Library
    @State private var items: [GroceryItem] = []
    @State private var done: Set<String> = []

    var body: some View {
        NavigationStack {
            List {
                if library.groceryIDs.isEmpty {
                    ContentUnavailableView("Empty list", systemImage: "cart",
                        description: Text("Open a recipe and choose “Add to grocery list”."))
                }
                ForEach(items) { item in
                    Button {
                        if done.contains(item.id) { done.remove(item.id) } else { done.insert(item.id) }
                    } label: {
                        VStack(alignment: .leading) {
                            Text(([item.quantities.joined(separator: " + "), item.unit ?? "", item.name])
                                    .filter { !$0.isEmpty }.joined(separator: " "))
                                .strikethrough(done.contains(item.id))
                            Text(item.recipes.joined(separator: ", ")).font(.caption).foregroundStyle(.secondary)
                        }
                    }.buttonStyle(.plain)
                }
            }
            .navigationTitle("Groceries")
            .toolbar { Button("Clear") { library.groceryIDs = []; items = [] } }
            .task(id: library.groceryIDs) {
                items = (try? await APIClient().groceryList(ids: Array(library.groceryIDs))) ?? []
            }
        }
    }
}

struct SettingsView: View {
    @State private var url = Settings.baseURL.absoluteString
    @State private var token = Settings.token

    var body: some View {
        NavigationStack {
            Form {
                Section("Server") {
                    TextField("Backend URL", text: $url).textInputAutocapitalization(.never).keyboardType(.URL)
                    SecureField("API token", text: $token)
                }
                Section {
                    Button("Save") {
                        if let u = URL(string: url) { Settings.baseURL = u }
                        Settings.token = token
                    }
                }
            }.navigationTitle("Settings")
        }
    }
}
