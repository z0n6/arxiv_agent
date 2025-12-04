import sqlite3
import os
from typing import List, Dict
from loguru import logger

DB_PATH = "data/user_library.db"
MAX_HISTORY = 20  # 🎯 Linus 建議：設定對話記憶上限

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # 讓我們可以用 dict 的方式存取欄位
    return conn

def init_db():
    """Initialize the SQLite database with simple tables."""
    # Ensure data directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    # 1. Bookmarks Table (Simple Set logic)
    c.execute('''
        CREATE TABLE IF NOT EXISTS bookmarks (
            paper_id TEXT PRIMARY KEY,
            title TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 2. Chat History Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paper_id TEXT,
            role TEXT,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create index for faster lookup
    c.execute('CREATE INDEX IF NOT EXISTS idx_chat_paper_id ON chat_history(paper_id)')
    
    conn.commit()
    conn.close()
    logger.info("📚 User Library Database initialized (SQLite).")

# === Bookmark Operations ===

def toggle_bookmark(paper_id: str, title: str) -> bool:
    """
    Toggle bookmark status. Returns True if added, False if removed.
    Atomic operation.
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Check if exists
        c.execute('SELECT 1 FROM bookmarks WHERE paper_id = ?', (paper_id,))
        exists = c.fetchone()
        
        if exists:
            c.execute('DELETE FROM bookmarks WHERE paper_id = ?', (paper_id,))
            is_bookmarked = False
        else:
            c.execute('INSERT INTO bookmarks (paper_id, title) VALUES (?, ?)', (paper_id, title))
            is_bookmarked = True
            
        conn.commit() # ✅ Atomic Commit
        return is_bookmarked
    except Exception as e:
        conn.rollback()
        logger.error(f"Database error (bookmark): {e}")
        raise
    finally:
        conn.close()

def get_all_bookmarks() -> List[str]:
    """Get list of all bookmarked paper IDs."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT paper_id FROM bookmarks ORDER BY created_at DESC')
    rows = c.fetchall()
    conn.close()
    return [row['paper_id'] for row in rows]

# === Chat History Operations (with Cap) ===

def add_chat_message(paper_id: str, role: str, content: str):
    """
    Add a message and enforce history limit (Linus's Rule #2).
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Insert new message
        c.execute(
            'INSERT INTO chat_history (paper_id, role, content) VALUES (?, ?, ?)',
            (paper_id, role, content)
        )
        
        # 2. Enforce Cap: Check count
        c.execute('SELECT count(*) FROM chat_history WHERE paper_id = ?', (paper_id,))
        count = c.fetchone()[0]
        
        if count > MAX_HISTORY:
            # ✂️ Remove oldest messages, keep top MAX_HISTORY
            # SQLite specific syntax to delete oldest
            c.execute('''
                DELETE FROM chat_history 
                WHERE id IN (
                    SELECT id FROM chat_history 
                    WHERE paper_id = ? 
                    ORDER BY id ASC 
                    LIMIT ?
                )
            ''', (paper_id, count - MAX_HISTORY))
            
        conn.commit() # ✅ Atomic Commit
    except Exception as e:
        conn.rollback()
        logger.error(f"Database error (chat): {e}")
    finally:
        conn.close()

def get_chat_history(paper_id: str) -> List[Dict]:
    """Retrieve history for context window."""
    conn = get_db_connection()
    c = conn.cursor()
    # Order by ID ensures chronological order
    c.execute('SELECT role, content FROM chat_history WHERE paper_id = ? ORDER BY id ASC', (paper_id,))
    rows = c.fetchall()
    conn.close()
    return [{"role": row['role'], "content": row['content']} for row in rows]
