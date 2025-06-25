import SwiftUI

struct ContentView: View {
    @State private var text: String = UIPasteboard.general.string ?? ""
    @State private var annotation: String = ""
    @State private var identifierPattern: String = ""
    @State private var databases: [Database] = []
    @State private var selectedDatabase: String = ""
    @State private var status: String = ""
    @State private var showingSettings = false

    @AppStorage("backendUrl") var backendUrl: String = "http://localhost:3000"
    @AppStorage("backendUser") var backendUser: String = ""
    @AppStorage("backendPass") var backendPass: String = ""

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Selection")) {
                    TextEditor(text: $text)
                        .frame(height: 120)
                }
                Section(header: Text("Annotation")) {
                    TextField("Optional", text: $annotation)
                }
                Section(header: Text("Identifier Pattern")) {
                    TextField("Optional", text: $identifierPattern)
                }
                if !databases.isEmpty {
                    Section(header: Text("Database")) {
                        Picker("Database", selection: $selectedDatabase) {
                            ForEach(databases, id: \.databaseId) { db in
                                Text(db.name ?? db.databaseId).tag(db.databaseId)
                            }
                        }
                    }
                }
                Section {
                    Button("Send to Notion", action: sendText)
                }
                if !status.isEmpty {
                    Section { Text(status) }
                }
            }
            .navigationBarTitle("NotyPDF")
            .navigationBarItems(trailing: Button("Settings") { showingSettings = true })
            .sheet(isPresented: $showingSettings, onDismiss: loadConfig) {
                SettingsView()
            }
            .onAppear(perform: loadConfig)
        }
    }

    func loadConfig() {
        let settings = BackendSettings(url: backendUrl, username: backendUser.isEmpty ? nil : backendUser, password: backendPass.isEmpty ? nil : backendPass)
        ApiService.shared.loadConfig(settings: settings) { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let cfg):
                    databases = cfg.savedDatabaseIds
                    selectedDatabase = databases.first?.databaseId ?? ""
                case .failure:
                    status = "Failed to load config"
                }
            }
        }
    }

    func sendText() {
        status = "Sending..."
        let settings = BackendSettings(url: backendUrl, username: backendUser.isEmpty ? nil : backendUser, password: backendPass.isEmpty ? nil : backendPass)
        ApiService.shared.sendText(text: text, identifierPattern: identifierPattern, annotation: annotation, databaseId: selectedDatabase.isEmpty ? nil : selectedDatabase, settings: settings) { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let identifier):
                    status = "Saved with ID \(identifier)"
                case .failure(let err):
                    status = "Error: \(err.localizedDescription)"
                }
            }
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
