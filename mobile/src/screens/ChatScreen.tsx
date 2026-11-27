import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import { sendChatMessage } from "../services/api";
import { useAppStore } from "../store/appStore";

interface Citation {
  id: number;
  title: string;
  doc_type: string;
  region: string;
  excerpt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export default function ChatScreen() {
  const { location, profile, preferredLanguage, setPreferredLanguage } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content:
        "👋 Hi! I'm UrbanAir, your source-grounded air quality assistant. Ask me anything — like \"Is it safe to go jogging today?\" or \"How do I protect my asthmatic child?\"",
      citations: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [isListening, setIsListening] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Web Speech recognition support
  const handleVoiceInput = () => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = preferredLanguage === "hi" ? "hi-IN" : "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);
      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      alert("Voice speech recognition is currently supported in Chrome and modern web browsers.");
    }
  };

  const mutation = useMutation({
    mutationFn: (message: string) =>
      sendChatMessage({
        message,
        history: messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        lat: location.lat,
        lng: location.lng,
        user_id: profile?.user_id,
        language: preferredLanguage,
      }),
    onSuccess: (data) => {
      const reply: Message = {
        id: Date.now().toString() + "_ai",
        role: "assistant",
        content: data.reply,
        citations: data.citations || [],
      };
      setMessages((prev) => [...prev, reply]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    },
  });

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    mutation.mutate(input.trim());
    setInput("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const quickQuestionsByLang: Record<string, string[]> = {
    en: [
      "Is it safe to jog today?",
      "How to protect kids from smog?",
      "Best indoor plants for clean air?",
      "Should I wear an N95 mask?",
    ],
    hi: [
      "क्या आज बाहर टहलना सुरक्षित है?",
      "बच्चों को स्मॉग से कैसे बचाएं?",
      "घर में एयर प्यूरीफायर कैसे इस्तेमाल करें?",
      "क्या N95 मास्क पहनना जरूरी है?",
    ],
    hinglish: [
      "Kya aaj subah running safe hai?",
      "Bachho ko smog se kaise bachaye?",
      "Ghar me best air cleaning tips?",
      "N95 mask kab pehanna chahiye?",
    ],
  };

  const quickQuestions = quickQuestionsByLang[preferredLanguage] || quickQuestionsByLang.en;

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.bubble,
        item.role === "user" ? styles.userBubble : styles.aiBubble,
      ]}
    >
      {item.role === "assistant" && (
        <View style={styles.assistantHeader}>
          <Text style={styles.aiTag}>🌿 UrbanAir (Grounded AI)</Text>
          {item.citations && item.citations.length > 0 && (
            <Text style={styles.verifiedTag}>✓ Cited</Text>
          )}
        </View>
      )}
      <Text
        style={[
          styles.bubbleText,
          item.role === "user" ? styles.userText : styles.aiText,
        ]}
      >
        {item.content}
      </Text>

      {/* RAG Source Citation Pills */}
      {item.citations && item.citations.length > 0 && (
        <View style={styles.citationsContainer}>
          <Text style={styles.citationHeading}>Scientific Evidence Sources:</Text>
          <View style={styles.citationsRow}>
            {item.citations.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.citationBadge}
                onPress={() => setSelectedCitation(c)}
              >
                <Text style={styles.citationBadgeText}>
                  [{c.id}] {c.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>💬 Ask UrbanAir</Text>
            <Text style={styles.headerSub}>Source-Grounded Medical & Health Assistant</Text>
          </View>
          <View style={styles.locationPill}>
            <Text style={styles.locationText}>📍 {location.city}</Text>
          </View>
        </View>

        {/* Language Selector */}
        <View style={styles.langRow}>
          <Text style={styles.langLabel}>Language:</Text>
          {(["en", "hi", "hinglish"] as const).map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.langChip,
                preferredLanguage === lang && styles.langChipActive,
              ]}
              onPress={() => setPreferredLanguage(lang)}
            >
              <Text
                style={[
                  styles.langChipText,
                  preferredLanguage === lang && styles.langChipTextActive,
                ]}
              >
                {lang === "en" ? "English" : lang === "hi" ? "हिंदी" : "Hinglish"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quick Questions */}
      {messages.length <= 1 && (
        <View style={styles.quickWrap}>
          {quickQuestions.map((q) => (
            <TouchableOpacity
              key={q}
              style={styles.quickChip}
              onPress={() => setInput(q)}
            >
              <Text style={styles.quickChipText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Typing indicator */}
      {mutation.isPending && (
        <View style={styles.typing}>
          <ActivityIndicator size="small" color="#2E7D32" />
          <Text style={styles.typingText}>UrbanAir is consulting health guidelines...</Text>
        </View>
      )}

      {/* Input Row */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={[styles.voiceBtn, isListening && styles.voiceBtnActive]}
          onPress={handleVoiceInput}
          title="Speak Question"
        >
          <Text style={styles.voiceBtnText}>{isListening ? "🔴" : "🎙️"}</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={
            preferredLanguage === "hi"
              ? "हवा की गुणवत्ता के बारे में पूछें..."
              : "Ask about air quality, outdoor safety, or kids..."
          }
          placeholderTextColor="#999"
          multiline
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />

        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || mutation.isPending}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>

      {/* Citation Detail Modal */}
      <Modal
        visible={!!selectedCitation}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCitation(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTag}>EVIDENCE CITATION [{selectedCitation?.id}]</Text>
              <TouchableOpacity onPress={() => setSelectedCitation(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDocTitle}>{selectedCitation?.title}</Text>
            <View style={styles.modalMetaRow}>
              <Text style={styles.modalMetaBadge}>
                Region: {selectedCitation?.region.toUpperCase()}
              </Text>
              <Text style={styles.modalMetaBadge}>
                Type: {selectedCitation?.doc_type.toUpperCase()}
              </Text>
            </View>

            <Text style={styles.modalExcerptLabel}>Scientific Excerpt:</Text>
            <View style={styles.modalExcerptBox}>
              <Text style={styles.modalExcerptText}>{selectedCitation?.excerpt}</Text>
            </View>

            <TouchableOpacity
              style={styles.modalDismissBtn}
              onPress={() => setSelectedCitation(null)}
            >
              <Text style={styles.modalDismissText}>Close Citation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: "#133E1B",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSub: { fontSize: 12, color: "#C8E6C9", marginTop: 2 },
  locationPill: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  locationText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  langRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  langLabel: { color: "#A5D6A7", fontSize: 12, fontWeight: "600" },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: "#2E7D32",
  },
  langChipActive: {
    backgroundColor: "#fff",
  },
  langChipText: { color: "#E8F5E9", fontSize: 12, fontWeight: "600" },
  langChipTextActive: { color: "#1B5E20", fontWeight: "bold" },

  quickWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 16,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#E8F5E9",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  quickChipText: { fontSize: 13, color: "#2E7D32" },

  messageList: { padding: 16, paddingBottom: 8 },

  bubble: {
    maxWidth: "85%",
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#059669",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  assistantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  aiTag: { fontSize: 11, color: "#2E7D32", fontWeight: "bold" },
  verifiedTag: {
    fontSize: 10,
    color: "#1B5E20",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: "700",
  },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  userText: { color: "#fff" },
  aiText: { color: "#222" },

  citationsContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  citationHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: "#666",
    marginBottom: 6,
  },
  citationsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  citationBadge: {
    backgroundColor: "#F1F8E9",
    borderWidth: 1,
    borderColor: "#C5E1A5",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  citationBadgeText: {
    fontSize: 11,
    color: "#33691E",
    fontWeight: "600",
  },

  typing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  typingText: { fontSize: 13, color: "#666", fontStyle: "italic" },

  inputRow: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: 24,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: 8,
    alignItems: "center",
  },
  voiceBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F8E9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C5E1A5",
  },
  voiceBtnActive: {
    backgroundColor: "#FFEBEE",
    borderColor: "#FFCDD2",
  },
  voiceBtnText: { fontSize: 18 },
  input: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 90,
    color: "#222",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: "#ccc" },
  sendBtnText: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTag: { fontSize: 11, color: "#2E7D32", fontWeight: "800", letterSpacing: 0.5 },
  closeBtn: { fontSize: 20, color: "#888", padding: 4 },
  modalDocTitle: { fontSize: 17, fontWeight: "bold", color: "#1B5E20", marginBottom: 6 },
  modalMetaRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  modalMetaBadge: {
    fontSize: 11,
    color: "#555",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontWeight: "600",
  },
  modalExcerptLabel: { fontSize: 13, fontWeight: "700", color: "#333", marginBottom: 6 },
  modalExcerptBox: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  modalExcerptText: { fontSize: 13, color: "#444", lineHeight: 20 },
  modalDismissBtn: {
    backgroundColor: "#1B5E20",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalDismissText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
});
