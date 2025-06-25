import UIKit
import Social
import MobileCoreServices

class ShareViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        handleSharedText()
    }

    private func handleSharedText() {
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem else { return }
        if let itemProvider = extensionItem.attachments?.first(where: { $0.hasItemConformingToTypeIdentifier(kUTTypeText as String) }) {
            itemProvider.loadItem(forTypeIdentifier: kUTTypeText as String, options: nil) { (item, error) in
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
        let url = defaults.string(forKey: "backendUrl") ?? "http://localhost:3000"
        let user = defaults.string(forKey: "backendUser")
        let pass = defaults.string(forKey: "backendPass")
        var request = URLRequest(url: URL(string: "\(url)/api/notion/save-text-with-identifier")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let u = user, let p = pass {
            let token = "\(u):\(p)".data(using: .utf8)?.base64EncodedString() ?? ""
            request.setValue("Basic \(token)", forHTTPHeaderField: "Authorization")
        }
        let body: [String: Any] = ["text": text, "config": [:]]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body, options: [])
        URLSession.shared.dataTask(with: request) { _, _, _ in
            self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        }.resume()
    }
}
