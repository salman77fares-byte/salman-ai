
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

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
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF10111A),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF8B5CF6),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
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
  static const String apiUrl =
      'https://salman-ai.lovable.app/api/chat';

  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  final List<Map<String, String>> _messages = [
    {
      'role': 'assistant',
      'content':
          'أهلًا بك في Salman AI 👋\nكيف يمكنني مساعدتك اليوم؟',
    },
  ];

  bool _loading = false;

  Future<void> _sendMessage() async {
    final text = _controller.text.trim();

    if (text.isEmpty || _loading) return;

    _controller.clear();

    setState(() {
      _messages.add({'role': 'user', 'content': text});
      _loading = true;
    });

    _scrollToBottom();

    try {
      final conversation = _messages
          .where((message) =>
              message['role'] == 'user' ||
              message['role'] == 'assistant')
          .map((message) => {
                'role': message['role']!,
                'content': message['content']!,
              })
          .toList();

      final response = await http
          .post(
            Uri.parse(apiUrl),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'text/plain',
            },
            body: jsonEncode({'messages': conversation}),
          )
          .timeout(const Duration(seconds: 60));

      if (response.statusCode >= 200 &&
          response.statusCode < 300) {
        final reply = utf8.decode(response.bodyBytes).trim();

        if (reply.isEmpty) {
          throw Exception('وصل رد فارغ من الخدمة.');
        }

        if (!mounted) return;

        setState(() {
          _messages.add({
            'role': 'assistant',
            'content': reply,
          });
        });
      } else {
        throw Exception(
          'الخدمة أعادت رمز الخطأ ${response.statusCode}.',
        );
      }
    } catch (error) {
      if (!mounted) return;

      String message;

      if (error.toString().contains('TimeoutException')) {
        message = 'استغرق الاتصال وقتًا طويلًا. حاول مجددًا.';
      } else {
        message =
            'تعذّر الاتصال بالذكاء الاصطناعي.\n'
            'تأكد من الإنترنت وأن خدمة الموقع تعمل، ثم حاول مجددًا.';
      }

      setState(() {
        _messages.add({
          'role': 'assistant',
          'content': message,
        });
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
        _scrollToBottom();
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF171824),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Salman AI',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            Text(
              'المساعد الذكي',
              style: TextStyle(fontSize: 12, color: Colors.white70),
            ),
          ],
        ),
        centerTitle: false,
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length + (_loading ? 1 : 0),
              itemBuilder: (context, index) {
                if (_loading && index == _messages.length) {
                  return const Align(
                    alignment: Alignment.centerLeft,
                    child: Padding(
                      padding: EdgeInsets.all(12),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                            ),
                          ),
                          SizedBox(width: 10),
                          Text('Salman AI يفكر...'),
                        ],
                      ),
                    ),
                  );
                }

                final message = _messages[index];
                final isUser = message['role'] == 'user';

                return Align(
                  alignment: isUser
                      ? Alignment.centerRight
                      : Alignment.centerLeft,
                  child: Container(
                    constraints: BoxConstraints(
                      maxWidth:
                          MediaQuery.of(context).size.width * 0.82,
                    ),
                    margin: const EdgeInsets.symmetric(vertical: 6),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isUser
                          ? const Color(0xFF6941C6)
                          : const Color(0xFF222432),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: SelectableText(
                      message['content'] ?? '',
                      textDirection: TextDirection.rtl,
                      style: const TextStyle(
                        fontSize: 16,
                        height: 1.6,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              decoration: const BoxDecoration(
                color: Color(0xFF171824),
                border: Border(
                  top: BorderSide(color: Color(0xFF303143)),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      textDirection: TextDirection.rtl,
                      minLines: 1,
                      maxLines: 5,
                      onSubmitted: (_) => _sendMessage(),
                      decoration: InputDecoration(
                        hintText: 'اكتب رسالتك هنا...',
                        filled: true,
                        fillColor: const Color(0xFF242635),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: 12,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _loading ? null : _sendMessage,
                    icon: const Icon(Icons.send_rounded),
                    tooltip: 'إرسال',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
