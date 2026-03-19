import SwiftUI

@MainActor
class ChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var isSending = false

    func load() async {
        isLoading = true
        error = nil
        do {
            messages = try await APIService.shared.getChatMessages()
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func send(_ text: String) async {
        isSending = true
        do {
            let msg = try await APIService.shared.sendChatMessage(text)
            messages.append(msg)
        } catch {}
        isSending = false
    }
}

struct ChatView: View {
    @StateObject private var viewModel = ChatViewModel()
    @State private var messageText = ""
    @FocusState private var isInputFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if viewModel.isLoading && viewModel.messages.isEmpty {
                    Spacer()
                    ProgressView("Loading messages...")
                    Spacer()
                } else if let error = viewModel.error, viewModel.messages.isEmpty {
                    Spacer()
                    ErrorBanner(message: error) { await viewModel.load() }
                    Spacer()
                } else if viewModel.messages.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "bubble.left.and.bubble.right")
                            .font(.system(size: 48))
                            .foregroundStyle(.secondary)
                        Text("No messages yet")
                            .font(.headline)
                            .foregroundStyle(.secondary)
                        Text("Send a message to your support team.")
                            .font(.subheadline)
                            .foregroundStyle(.tertiary)
                    }
                    Spacer()
                } else {
                    messagesList
                }

                // Input bar
                inputBar
            }
            .navigationTitle("Messages")
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
        }
    }

    private var messagesList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(viewModel.messages) { msg in
                        messageBubble(msg)
                            .id(msg.id)
                    }
                }
                .padding()
            }
            .onChange(of: viewModel.messages.count) { _ in
                if let last = viewModel.messages.last {
                    withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                }
            }
        }
    }

    private func messageBubble(_ msg: ChatMessage) -> some View {
        let isClient = (msg.senderRole ?? "client") == "client"
        return HStack {
            if isClient { Spacer(minLength: 60) }
            VStack(alignment: isClient ? .trailing : .leading, spacing: 4) {
                if !isClient, let name = msg.senderName {
                    Text(name)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Text(msg.message)
                    .font(.subheadline)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(isClient ? Brand.navy : Color(.secondarySystemBackground))
                    .foregroundStyle(isClient ? .white : .primary)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                if let createdAt = msg.createdAt {
                    Text(formatTime(createdAt))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
            if !isClient { Spacer(minLength: 60) }
        }
    }

    private var inputBar: some View {
        HStack(spacing: 12) {
            TextField("Type a message...", text: $messageText)
                .textFieldStyle(.roundedBorder)
                .focused($isInputFocused)
                .submitLabel(.send)
                .onSubmit(sendAction)

            Button(action: sendAction) {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title2)
                    .foregroundStyle(messageText.trimmingCharacters(in: .whitespaces).isEmpty ? .gray : Brand.navy)
            }
            .disabled(messageText.trimmingCharacters(in: .whitespaces).isEmpty || viewModel.isSending)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
        .overlay(alignment: .top) { Divider() }
    }

    private func sendAction() {
        let text = messageText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        messageText = ""
        Task { await viewModel.send(text) }
    }

    private func formatTime(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateString) else {
            formatter.formatOptions = [.withInternetDateTime]
            guard let date = formatter.date(from: dateString) else { return "" }
            return date.formatted(date: .abbreviated, time: .shortened)
        }
        return date.formatted(date: .abbreviated, time: .shortened)
    }
}
