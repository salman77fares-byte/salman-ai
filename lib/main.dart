import 'package:flutter/material.dart';

void main() {
  runApp(const SalmanAiApp());
}

class SalmanAiApp extends StatelessWidget {
  const SalmanAiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Salman AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF121212),
        primaryColor: const Color(0xFF6200EE),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFBB86FC),
          surface: Color(0xFF1E1E1E),
        ),
      ),
      home: const ChatScreen(),
    );
  }
}

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, String>> _messages = [
    {"sender": "ai", "text": "أهلاً بك في تطبيق Salman AI الأصلي! كيف يمكنني مساعدتك اليوم؟"}
  ];

  void _sendMessage() {
    if (_controller.text.trim().isEmpty) return;
    setState(() {
      _messages.add({"sender": "user", "text": _controller.text.trim()});
      _messages.add({"sender": "ai", "text": "تم استلام رسالتك عبر واجهة Flutter الأصلية السريعة."});
    });
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Salman AI - المهندس سلمان فارس'),
        centerTitle: true,
        backgroundColor: const Color(0xFF1F1F1F),
        elevation: 2,
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final isUser = _messages[index]["sender"] == "user";
                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 4.0),
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                    decoration: BoxDecoration(
                      color: isUser ? const Color(0xFF3700B3) : const Color(0xFF2C2C2C),
                      borderRadius: BorderRadius.circular(16.0),
                    ),
                    child: Text(
                      _messages[index]["text"]!,
                      style: const TextStyle(color: Colors.white, fontSize: 16),
                    ),
                  ),
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.all(12.0),
            color: const Color(0xFF1F1F1F),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      hintText: 'اكتب رسالتك هنا...',
                      hintStyle: TextStyle(color: Colors.grey),
                      border: InputBorder.none,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.send, color: Color(0xFFBB86FC)),
                  onPressed: _sendMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
