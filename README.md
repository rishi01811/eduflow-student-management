# EduFlow - Student Management Platform

EduFlow is a modern, responsive Software-as-a-Service (SaaS) application designed for managing student records effectively. Built with a sleek, dark-themed UI, it provides an intuitive dashboard and streamlined functionality for robust student data management.

## Features

- **Modern UI/UX:** Built with a premium dark theme (Zinc-950 palette) using custom CSS, featuring clean aesthetics and fully responsive design.
- **Authentication System:** Secure login and user authentication flows (`auth.js`, `login.html`).
- **Student Dashboard:** Comprehensive overview of student metrics and easy navigation (`dashboard.html`).
- **Student Data Management:** Capabilities to view, add, edit, and manage student details efficiently (`students.js`).
- **CSV Integration:** Easy import and export of student data using CSV format (`csv.js`).
- **Integrated Chatbot:** An embedded chatbot to assist users with common queries inside the application (`chatbot.js`).
- **Firebase Integration:** Ready for real-time database and backend support using Firebase (`config.js`).

## Technology Stack

- **Frontend:** HTML5, CSS3 (Custom responsive styling), Vanilla JavaScript
- **Typography:** Outfit (UI text) & JetBrains Mono (Data/Metrics)
- **Backend/Database:** Firebase Configuration

## Project Structure

- `index.html`: Main landing page of the application.
- `login.html`: Authentication page.
- `dashboard.html`: The main user dashboard for analytics.
- `style.css`: Core design system, utilities, and component styling.
- `auth.js`: Handles user authentication and sessions.
- `dashboard.js`: Logic for dashboard interactivity and dynamic rendering.
- `students.js`: Manages student data operations (CRUD).
- `csv.js`: Logic for parsing internal data to CSV and vice versa.
- `chatbot.js`: Drives the automated assistant functionality.
- `config.js`: Application and backend configuration settings.

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   ```
2. **Setup Firebase:**
   Update your Firebase credentials in `config.js` to ensure the backend is connected properly.
3. **Run the Project:**
   Since the project uses vanilla web technologies, you can simply open `index.html` in your browser or serve the directory using a local development server (e.g., VS Code Live Server).

## License

This project is licensed under the [MIT License](LICENSE).
