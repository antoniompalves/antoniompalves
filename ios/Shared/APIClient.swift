import Foundation

/// Settings live in the App Group so the Share Extension can use them too.
enum Settings {
    static let group = UserDefaults(suiteName: "group.com.example.recipebox") ?? .standard
    static var baseURL: URL {
        get { URL(string: group.string(forKey: "baseURL") ?? "http://localhost:8000")! }
        set { group.set(newValue.absoluteString, forKey: "baseURL") }
    }
    static var token: String {
        get { group.string(forKey: "token") ?? "" }
        set { group.set(newValue, forKey: "token") }
    }
    /// Job ids created by the share extension, picked up by the app to show progress.
    static var pendingJobs: [String] {
        get { group.stringArray(forKey: "pendingJobs") ?? [] }
        set { group.set(newValue, forKey: "pendingJobs") }
    }
}

struct APIError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

struct APIClient {
    var baseURL = Settings.baseURL
    var token = Settings.token

    private func request(_ path: String, method: String = "GET", body: Encodable? = nil,
                         query: [URLQueryItem] = []) async throws -> Data {
        var comps = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { comps.queryItems = query }
        var req = URLRequest(url: comps.url!)
        req.httpMethod = method
        if !token.isEmpty { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONEncoder().encode(AnyEncodable(body))
        }
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let detail = (try? JSONDecoder().decode([String: String].self, from: data))?["detail"]
            throw APIError(message: detail ?? "Server error (\((resp as? HTTPURLResponse)?.statusCode ?? 0))")
        }
        return data
    }

    func startImport(url: String? = nil, text: String? = nil) async throws -> ImportJob {
        var body: [String: String] = [:]
        if let url { body["url"] = url }
        if let text { body["text"] = text }
        return try JSONDecoder().decode(ImportJob.self, from: await request("imports", method: "POST", body: body))
    }

    func job(_ id: String) async throws -> ImportJob {
        try JSONDecoder().decode(ImportJob.self, from: await request("imports/\(id)"))
    }

    /// Polls until the job finishes; returns the recipe id.
    func waitForImport(_ id: String) async throws -> String {
        while true {
            let j = try await job(id)
            if j.status == "done", let rid = j.recipe_id { return rid }
            if j.status == "failed" { throw APIError(message: j.error ?? "Import failed") }
            try await Task.sleep(for: .seconds(1.5))
        }
    }

    func recipes(query: String? = nil, collection: String? = nil) async throws -> [Recipe] {
        var q: [URLQueryItem] = []
        if let query, !query.isEmpty { q.append(.init(name: "q", value: query)) }
        if let collection { q.append(.init(name: "collection", value: collection)) }
        return try JSONDecoder().decode([Recipe].self, from: await request("recipes", query: q))
    }

    func recipe(_ id: String, servings: Int? = nil) async throws -> Recipe {
        if let servings {
            return try JSONDecoder().decode(Recipe.self, from: await request(
                "recipes/\(id)/scaled", query: [.init(name: "servings", value: String(servings))]))
        }
        return try JSONDecoder().decode(Recipe.self, from: await request("recipes/\(id)"))
    }

    func update(_ id: String, fields: [String: AnyEncodable]) async throws -> Recipe {
        try JSONDecoder().decode(Recipe.self, from: await request("recipes/\(id)", method: "PATCH", body: fields))
    }

    func delete(_ id: String) async throws { _ = try await request("recipes/\(id)", method: "DELETE") }

    func groceryList(ids: [String]) async throws -> [GroceryItem] {
        try JSONDecoder().decode([GroceryItem].self, from: await request(
            "grocery-list", query: [.init(name: "ids", value: ids.joined(separator: ","))]))
    }
}

struct AnyEncodable: Encodable {
    private let encodeFn: (Encoder) throws -> Void
    init(_ value: Encodable) { encodeFn = value.encode }
    func encode(to encoder: Encoder) throws { try encodeFn(encoder) }
}
