import Foundation

struct BackendSettings {
    var url: String
    var username: String?
    var password: String?
}

struct AppConfig: Codable {
    let savedDatabaseIds: [Database]
    let columnMappings: [String: ColumnMapping]
}

struct Database: Codable {
    let databaseId: String
    let name: String?
}

struct ColumnMapping: Codable {
    var identifierColumn: String?
    var textColumn: String?
    var annotationColumn: String?
    var pageColumn: String?
    var identifierPattern: String?
    var annotation: String?
    var pageNumber: String?
    var documentIdInsertionColumn: String?
    var enableDocumentIdInsertion: Bool?
}

class ApiService {
    static let shared = ApiService()

    func loadConfig(settings: BackendSettings, completion: @escaping (Result<AppConfig, Error>) -> Void) {
        guard let url = URL(string: "\(settings.url)/api/config") else { return completion(.failure(ApiError.invalidURL)) }
        var request = URLRequest(url: url)
        if let u = settings.username, let p = settings.password {
            let token = "\(u):\(p)".data(using: .utf8)?.base64EncodedString() ?? ""
            request.setValue("Basic \(token)", forHTTPHeaderField: "Authorization")
        }
        URLSession.shared.dataTask(with: request) { data, res, err in
            if let err = err { return completion(.failure(err)) }
            guard let data = data else { return completion(.failure(ApiError.noData)) }
            do {
                let cfg = try JSONDecoder().decode(AppConfig.self, from: data)
                completion(.success(cfg))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }

    func sendText(text: String, identifierPattern: String?, annotation: String?, databaseId: String?, settings: BackendSettings, completion: @escaping (Result<String, Error>) -> Void) {
        loadConfig(settings: settings) { result in
            switch result {
            case .failure(let err):
                completion(.failure(err))
            case .success(let cfg):
                guard let db = databaseId ?? cfg.savedDatabaseIds.first?.databaseId else {
                    completion(.failure(ApiError.noDatabase))
                    return
                }
                let mapping = cfg.columnMappings[db] ?? ColumnMapping()

                var notionConfig: [String: Any] = ["databaseId": db]
                notionConfig["identifierColumn"] = mapping.identifierColumn
                notionConfig["textColumn"] = mapping.textColumn
                notionConfig["annotationColumn"] = mapping.annotationColumn
                notionConfig["pageColumn"] = mapping.pageColumn
                notionConfig["documentIdInsertionColumn"] = mapping.documentIdInsertionColumn
                if let flag = mapping.enableDocumentIdInsertion {
                    notionConfig["enableDocumentIdInsertion"] = flag
                }
                if let page = mapping.pageNumber {
                    notionConfig["pageNumber"] = page
                }
                if let idp = identifierPattern, !idp.isEmpty {
                    notionConfig["identifierPattern"] = idp
                } else if let saved = mapping.identifierPattern {
                    notionConfig["identifierPattern"] = saved
                }
                if let ann = annotation, !ann.isEmpty {
                    notionConfig["annotation"] = ann
                } else if let saved = mapping.annotation {
                    notionConfig["annotation"] = saved
                }

                let payload: [String: Any] = ["config": notionConfig, "text": text]

                guard let url = URL(string: "\(settings.url)/api/notion/save-text-with-identifier") else {
                    completion(.failure(ApiError.invalidURL))
                    return
                }
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                if let u = settings.username, let p = settings.password {
                    let token = "\(u):\(p)".data(using: .utf8)?.base64EncodedString() ?? ""
                    request.setValue("Basic \(token)", forHTTPHeaderField: "Authorization")
                }
                do {
                    request.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])
                } catch {
                    completion(.failure(error))
                    return
                }
                URLSession.shared.dataTask(with: request) { data, res, err in
                    if let err = err {
                        completion(.failure(err))
                        return
                    }
                    guard let data = data else {
                        completion(.failure(ApiError.noData))
                        return
                    }
                    if let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any], let success = json["success"] as? Bool, success, let id = json["identifier"] as? String {
                        completion(.success(id))
                    } else {
                        completion(.failure(ApiError.server))
                    }
                }.resume()
            }
        }
    }

    enum ApiError: Error {
        case invalidURL
        case noData
        case noDatabase
        case server
    }
}
