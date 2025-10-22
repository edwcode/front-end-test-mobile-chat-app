# Front-End Test: Mobile Chat App

Welcome to the **Sainapsis Front-End Test!** This test involves implementing a series of improvements—both bug fixes and new features—within the codebase of this repository. The project is a **fully functional mobile chat app** built with **Expo** and **React Native**.

> **New to Expo?** No worries! The codebase already covers most of the framework’s fundamentals, and your web development experience should help you get up to speed quickly. If you're unfamiliar with Expo, **just let us know—we’ll consider that when reviewing your submission**.

## 📌 Notes

- We’ve designed this test to reflect real-world challenges you'll face at **Sainapsis**—although in a much simpler form.
- We encourage you to leverage **AI tools**, such as [Cursor IDE](https://cursor.sh) (which offers a free tier with advanced AI models), to enhance your workflow. However, **you must remain in full control** of any AI-generated code.
- Ensure that all changes adhere to **high-quality standards** and follow **best practices**.
- During the review process, we will analyze your decisions, and in a **live coding session**, we may request further improvements. **You can still use AI in your IDE of choise** during live coding, but be ready to explain your codebase understanding and the reasoning behind your modifications whether implemented with AI assistance or manually.

## 🎉 Fun Fact

This codebase was generated **entirely from scratch** using **Cursor IDE** with **Sonnet 3.7** in approximately **2 hours** and around **3 prompts** (plus a few failed prompts/responses from the AI in between). There was **little to almost no supervision** during the process—**intentionally**.

Why? Because we wanted to allow possible **errors that result from improper AI usage**, giving you the opportunity to **possible identify and fix them** and above all, ensuring you **don’t introduce new ones**. Remember, we expect you to demonstrate **good AI-assisted coding practices** throughout this test if you choose to use it.

## Getting Started with running the app in local

1. Clone this repository
2. Install dependencies with `npm install`
3. Start the development server with `npm start`
4. Use the Expo Go app on your device or an emulator to run the application

## Your Challenge

You’re free to choose any number of tasks from the list of **Bug Fixes**, **UI/UX Enhancements**, **Feature Additions**, or **Performance Improvements**. Alternatively, you can **ignore the list and improve the app however you see fit** which we’d love to see!

That said, we care far more about **code quality** and **simplicity** (*KISS principles*) than about the number of tasks completed. **Choose tasks that best showcase your seniority and thoughtful design**, rather than trying to tackle too much.

Please make sure to **document your task selection, implementation details, and reasoning** in the `IMPLEMENTATION.md` file, as outlined in the **Submission Guidelines**.

> ⚠️ A common pitfall we've seen is **overscoping** — putting in a lot of effort across too many tasks, which leads to rushed or unfocused results.  
> This test is **very doable in just a few focused hours** if scped and approached smartly with one goal in mind, showcase your code simplicity and quality, thats it.

### Code Quality & Architecture

- [ ] Question the implementation of the architecture from the AppContext.ts, hooks, etc. Remember, this architecture was made by the IA with low to none suppervision, so dont extend actual code without thinking about it, instead refactor it to start using better practices for that you see fit. This is possible the most important thing to have in mind and you can implement it gradually (while attacking other tasks but questioning at all time what to refactor and what to extend as is.)

### Performance Improvements (extra points for anything regarding data management improvement since this is a offline first app and its important to use the localDb wisely)

- [x] Optimize message list rendering with virtualization ✅ **COMPLETED**
- [x] Add pagination for loading older messages ✅ **COMPLETED** (50 messages per page)
- [x] Optimize database queries and state management ✅ **COMPLETED** (JOINs, batch queries, useReducer)
- [x] Implement proper memory management for media content ✅ **COMPLETED** (LRU cache, 100MB limit, auto-cleanup)

### Feature Additions (rmember, we encourgae you to tackle just some challinging features instead of lots os easy ones, choose the difficult over easy the easy ones also to better showcase your skills)

- [x] Add media sharing capabilities (photos preferably, with a optimized/compressed preview instead of the original image) ✅ **COMPLETED** (adaptive compression 50-80%)
- [x] Add read receipts for messages along with status indicators (sent, read) ✅ **COMPLETED** (sent/delivered/read with visual indicators)
- [x] Add message deletion and editing ✅ **COMPLETED** (soft delete, edit history, context menu)
- [x] Implement message search functionality ✅ **COMPLETED** (debounce, cache, filters, highlighting)

### Bug Fixes

- [x] Fix message ordering in chat rooms (newest messages should appear at the bottom, next to the input box) ✅ **COMPLETED** (FlashList inverted + timestamp sort)
- [x] Resolve keyboard or other components overlap issues on different device sizes ✅ **COMPLETED** (Dynamic KeyboardAvoidingView + SafeAreaView + listeners)

## Assessment Criteria

Your submission will be evaluated on:

1. **Code Quality**: Clean, maintainable, and well-structured code
2. **Problem Solving**: How you approach and solve the identified issues
3. **Technical Proficiency**: Effective use of React Native, TypeScript, and related technologies
4. **UI/UX Skills**: Visual appeal and user experience of your implementation
5. **Documentation**: Clear explanation of your changes and decisions

## Submission Guidelines

1. Fork this repository
2. Implement your changes in a clean, organized manner
3. Document your changes (and reasoning behind your choises if you fell its woth it) in a IMPLEMENTATION.md
4. Submit a pull request with your improvements
5. Include a brief summary of what you implemented and why

Good luck with your assessment! We look forward to reviewing your submission.
