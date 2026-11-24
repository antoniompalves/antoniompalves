import Foundation

struct Ingredient: Codable, Hashable {
    var quantity: String?
    var unit: String?
    var name: String
    var note: String?
    var group: String?

    var display: String {
        [quantity, unit, name].compactMap { $0 }.joined(separator: " ")
            + (note.map { ", \($0)" } ?? "")
    }
}

struct Step: Codable, Hashable {
    var text: String
    var timestamp_seconds: Int?
}

struct Nutrition: Codable, Hashable {
    var calories: Int?
    var protein_g: Double?
    var carbs_g: Double?
    var fat_g: Double?
}

struct Recipe: Codable, Identifiable, Hashable {
    var id: String
    var title: String
    var description: String?
    var servings: Int?
    var prep_minutes: Int?
    var cook_minutes: Int?
    var total_minutes: Int?
    var cuisine: String?
    var meal_type: String?
    var tags: [String]
    var ingredients: [Ingredient]
    var steps: [Step]
    var nutrition_estimate: Nutrition?
    var confidence: Double
    var inferred_fields: [String]
    var source_url: String
    var source_platform: String
    var author: String?
    var thumbnail_url: String?
    var created_at: String
    var collections: [String]
    var favorite: Bool
}

struct ImportJob: Codable, Identifiable {
    var id: String
    var status: String
    var url: String?
    var recipe_id: String?
    var error: String?
}

struct GroceryItem: Codable, Identifiable, Hashable {
    var name: String
    var unit: String?
    var quantities: [String]
    var recipes: [String]
    var id: String { name + (unit ?? "") }
}
