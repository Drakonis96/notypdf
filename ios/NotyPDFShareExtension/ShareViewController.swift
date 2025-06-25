import UIKit
import Social
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        handleSharedText()
    }

    private func handleSharedText() {
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem else { return }
        if let itemProvider = extensionItem.attachments?.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.text.identifier) }) {
            itemProvider.loadItem(forTypeIdentifier: UTType.text.identifier, options: nil) { (item, error) in
                if let text = item as? String {
                    DispatchQueue.main.async {
                        self.sendText(text)
                    }
                }
            }
        }
    }

    private func sendText(_ text: String) {
        let defaults = UserDefaults.standard
        let base = defaults.string(forKey: "backendUrl") ?? "http://localhost:3000"
        let user = defaults.string(forKey: "backendUser")
        let pass = defaults.string(forKey: "backendPass")

        func authRequest(_ url: URL) -> URLRequest {
            var req = URLRequest(url: url)
            if let u = user, let p = pass {
                let token = "\(u):\(p)".data(using: .utf8)?.base64EncodedString() ?? ""
                req.setValue("Basic \(token)", forHTTPHeaderField: "Authorization")
            }
            return req
        }

        guard let cfgURL = URL(string: "\(base)/api/config") else { return }
        let cfgReq = authRequest(cfgURL)
        URLSession.shared.dataTask(with: cfgReq) { data, _, _ in
            guard let data = data,
                  let cfg = try? JSONDecoder().decode(AppConfig.self, from: data),
                  let db = cfg.savedDatabaseIds.first?.databaseId,
                  let mapping = cfg.columnMappings[db] else {
                self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
                return
            }

            var notionConfig: [String: Any] = ["databaseId": db]
            notionConfig["identifierColumn"] = mapping.identifierColumn
            notionConfig["textColumn"] = mapping.textColumn
            notionConfig["annotationColumn"] = mapping.annotationColumn
            notionConfig["pageColumn"] = mapping.pageColumn
            notionConfig["documentIdInsertionColumn"] = mapping.documentIdInsertionColumn
            if let flag = mapping.enableDocumentIdInsertion { notionConfig["enableDocumentIdInsertion"] = flag }
            if let page = mapping.pageNumber { notionConfig["pageNumber"] = page }
            if let pattern = mapping.identifierPattern { notionConfig["identifierPattern"] = pattern }
            if let ann = mapping.annotation { notionConfig["annotation"] = ann }

            let payload: [String: Any] = ["config": notionConfig, "text": text]

            guard let url = URL(string: "\(base)/api/notion/save-text-with-identifier") else { return }
            var request = authRequest(url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try? JSONSerialization.data(withJSONObject: payload, options: [])
            URLSession.shared.dataTask(with: request) { _, _, _ in
                self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
            }.resume()
        }.resume()
    }
}
