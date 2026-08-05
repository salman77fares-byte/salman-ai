# Salman AI 

Role & Goal:

You are an expert UI/UX designer and full-stack developer. Build a complete, responsive, and ultra-modern Web Application named Salman AI (سلمان للتقنية / Salman AI). The app should be a sleek AI Chat platform similar to ChatGPT or Claude.

​1. Layout & Structure

​Sidebar (Collapsible & Mobile Friendly):

​Logo/App Title: "Salman AI" at the top with a subtle AI badge icon.

​"New Chat" button (prominent and styled with high contrast).

​Section for Chat History grouped by date (Today, Yesterday, Previous 7 Days).

​Options at the bottom: Dark/Light Mode toggle, Clear Conversations, and Settings.

​Main Chat Window:

​Welcome View (Empty State): Displays when no chat is active. Shows: "مرحباً بك، أنا Salman AI. كيف يمكنني مساعدتك اليوم؟" alongside quick action prompt cards (e.g., "ساعدني في كتابة كود", "لخص هذا النص", "أفكار لمشاريع جديدة").

​Active Chat Stream: Displays distinct chat bubbles for User (aligned right/styled distinctly) and Salman AI (aligned left/distinct icon).

​Input Area: Sticky bottom input bar with:

​Multi-line textarea auto-expanding as typed.

​Buttons for Upload File/Attachment, Voice Input, and Send.

​2. UI/UX & Design Details

​Language & Typography:

​Full RTL (Right-to-Left) support for Arabic text, along with seamless LTR support for English and code blocks.

​Modern, clean font (such as Almarai or Inter).

​Code Blocks & Formatting:

​Syntax highlighting for code responses with a Copy Code button at the top-right of every code block.

​Markdown support (bold text, lists, headers, tables).

​Interactivity:

​Animated typing indicator when Salman AI is generating a response.

​"Copy message" and "Regenerate response" buttons below AI responses.

​3. Supabase & Backend Setup

​Setup Supabase integration for authentication (Sign up / Login).

​Create tables for:

​conversations (id, user_id, title, created_at).

​messages (id, conversation_id, sender, content, created_at).

​Prepare a clean integration architecture for calling a Supabase Edge Function (chat-with-salman) to handle OpenAI / Gemini API requests securely.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://salman-ai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7b49c286-5b40-474b-a3e2-e353200ab43c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
