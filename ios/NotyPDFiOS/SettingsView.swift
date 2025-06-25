import SwiftUI

struct SettingsView: View {
    @AppStorage("backendUrl") var backendUrl: String = "http://localhost:3000"
    @AppStorage("backendUser") var backendUser: String = ""
    @AppStorage("backendPass") var backendPass: String = ""
    @Environment(\.presentationMode) var presentationMode

    @State private var testStatus: String = ""

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Backend URL")) {
                    TextField("http://localhost:3000", text: $backendUrl)
                        .keyboardType(.URL)
                        .autocapitalization(.none)
                }
                Section(header: Text("Username")) {
                    TextField("", text: $backendUser)
                }
                Section(header: Text("Password")) {
                    SecureField("", text: $backendPass)
                }
                Section {
                    Button("Test Connection", action: testConnection)
                    Button("Close") { presentationMode.wrappedValue.dismiss() }
                }
                if !testStatus.isEmpty {
                    Section { Text(testStatus) }
                }
            }
            .navigationBarTitle("Settings", displayMode: .inline)
        }
    }

    func testConnection() {
        let settings = BackendSettings(url: backendUrl, username: backendUser.isEmpty ? nil : backendUser, password: backendPass.isEmpty ? nil : backendPass)
        guard let url = URL(string: "\(settings.url)/api/notion/test-connection") else { return }
        var request = URLRequest(url: url)
        if let u = settings.username, let p = settings.password {
            let token = "\(u):\(p)".data(using: .utf8)?.base64EncodedString() ?? ""
            request.setValue("Basic \(token)", forHTTPHeaderField: "Authorization")
        }
        URLSession.shared.dataTask(with: request) { data, _, _ in
            var message = "Failed"
            if let data = data, let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any], let success = json["success"] as? Bool {
                message = success ? "Connection successful" : (json["message"] as? String ?? "Failed")
            }
            DispatchQueue.main.async { testStatus = message }
        }.resume()
    }
}

struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        SettingsView()
    }
}
