<!-- Centered logo -->
<p align="center">
  <img src="public/static/logo.png" alt="NotyPDF Logo" width="120" />
</p>

<h1 align="center">NotyPDF</h1>

<p align="center">
  <b>Extract, organize, and save PDF highlights directly to Notion with automatic reference management.</b>
</p>

---

## Overview
NotyPDF helps you extract and save text from PDF documents to your Notion database, with flexible configuration options for organizing your notes and references.

## Main Features
- **PDF Upload**: Drag & drop or select PDF files for viewing.
- **Text Selection**: Select and highlight text within PDF documents.
- **Notion Integration**: Save selected text, annotations, and page numbers directly to your Notion database.
- **Custom Identifiers**: Generate sequential, customizable reference IDs (e.g., `LV001_RF025`).
- **Automatic Reference Numbering**: If a reference ID already exists, NotyPDF will automatically increment the number for you.
- **Document Tagging**: Optionally insert a document ID as a tag in a multi-select Notion column for easy filtering.
- **Annotation Support**: Add your own notes or categories to each reference.
- **Easy Configuration**: User-friendly interface for setting up Notion API credentials and database columns.

## How It Works
1. **Load your PDF document**
2. **Configure your Notion database connection and columns**
3. **Select text from the document**
4. **Add optional annotation and page number**
5. **Save to your Notion database**

### Database Configuration
- **Database ID**: Your Notion database's unique identifier
- **Identifier Column**: Where each entry's unique identifier will be stored
- **Text Column**: Where the selected text will be saved
- **Annotation Column**: For your notes about the extracted text
- **Page Column**: Where page numbers will be stored

### Identifier Pattern
The identifier pattern uses underscores as separators, e.g. `BOOKID_REFID` (like `LV001_RF025`).
- **BOOKID**: Your document's unique code (e.g., LV001)
- **REFID**: The specific reference/note's unique identifier (e.g., RF025)

If you enter an identifier that already exists, NotyPDF will automatically increment the reference number (e.g., `LV001_RF001` → `LV001_RF002`).

### Document Identifier Insertion
- Use a multi-select column in your Notion database for document IDs.
- When enabled, the BOOKID part of your identifier will be added as a tag, making it easy to filter references by document.

### Tips & Tricks
- Use standardized naming for document IDs (e.g., LV001, BK002)
- Number references sequentially (RF001, RF002) or by page (P045-1, P045-2)
- Use the annotation field for your own notes or categories
- Filter your Notion database by document using the multi-select column
- Sort references by their reference ID for better organization

---

## Getting Started

### 1. Download from GitHub
If you are new to GitHub or coding, follow these steps:

1. Go to the [NotyPDF GitHub repository](https://github.com/drakonis96/notypdf).
2. Click the green **Code** button, then **Download ZIP**.
3. Extract the ZIP file to a folder on your computer (for example, your Desktop).

### 2. Set Up Environment Variables

1. Open the extracted folder.
2. Find the file named `.env.example` and make a copy of it.
3. Rename the copy to `.env`.

   - **On Windows:**  
     Open Command Prompt in the folder and run:  
     ```sh
     copy .env.example .env
     ```
   - **On Mac/Linux:**  
     Open Terminal in the folder and run:  
     ```sh
     cp .env.example .env
     ```

4. Open `.env` with a text editor (like Notepad or VS Code).

   - **On Windows:**  
     Double-click `.env` to open with Notepad, or run:  
     ```sh
     notepad .env
     ```
   - **On Mac:**  
     Simply run in Terminal:  
     ```sh
     open .env
     ```
     Or use your favorite editor (for example, VS Code):
     ```sh
     code .env
     ```
   - **On Linux:**  
     Use your preferred editor, for example:  
     ```sh
     nano .env
     ```

5. Add your Notion API key and any other required keys. Example:
   ```env
   NOTION_API_KEY=secret_your_notion_api_key_here
   OPENAI_API_KEY=your_openai_key_here
   OPENROUTER_API_KEY=your_openrouter_key_here
   GEMINI_API_KEY=your_gemini_key_here
   DEEPSEEK_API_KEY=your_deepseek_key_here
   ```

### 3. Run with Docker Compose (Recommended for Beginners)

If you have never used Docker before, follow these steps:

1. [Download and install Docker Desktop](https://www.docker.com/products/docker-desktop/) for your operating system (Windows, Mac, or Linux).
2. Open Docker Desktop and make sure it is running.
3. Open a terminal (Command Prompt on Windows, Terminal on Mac/Linux).
4. Use the `cd` command to go to the folder where you extracted NotyPDF. For example:
   ```sh
   cd Desktop/notypdf
   ```
5. Run this command to start the app:
   ```sh
   docker-compose up --build
   ```
6. Wait until you see a message that the server is running.
7. Open your web browser and go to [http://localhost:5026](http://localhost:5026)

### 4. Alternative: Run the React Server Directly (For Developers)

If you have Node.js and npm installed:

1. Open a terminal in the NotyPDF folder.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the development server:
   ```sh
   npm start
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.

---

<p align="center"><i>Happy reading and organizing with NotyPDF!</i></p>
