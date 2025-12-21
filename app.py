from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime
import sqlite3
import os

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# Database setup
# Use /instance directory for Render persistent disk, fallback to local for development
INSTANCE_DIR = '/instance'
if not os.path.exists(INSTANCE_DIR):
    os.makedirs(INSTANCE_DIR, exist_ok=True)
DATABASE = os.path.join(INSTANCE_DIR, 'teamup.db')

def init_db():
    """Initialize the database with required tables"""
    # Ensure instance directory exists
    os.makedirs(INSTANCE_DIR, exist_ok=True)
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    # Waitlist table
    c.execute('''
        CREATE TABLE IF NOT EXISTS waitlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            sent INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Add sent column if it doesn't exist (for existing databases)
    try:
        c.execute('ALTER TABLE waitlist ADD COLUMN sent INTEGER DEFAULT 0')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    # Ambassador applications table
    c.execute('''
        CREATE TABLE IF NOT EXISTS ambassador_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            school TEXT NOT NULL,
            grade TEXT NOT NULL,
            community_access TEXT NOT NULL,
            why_interested TEXT NOT NULL,
            experience TEXT,
            time_commitment TEXT NOT NULL,
            sent INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Add sent column if it doesn't exist (for existing databases)
    try:
        c.execute('ALTER TABLE ambassador_applications ADD COLUMN sent INTEGER DEFAULT 0')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    conn.commit()
    conn.close()

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    """Landing page"""
    return render_template('index.html')

@app.route('/ambassador')
def ambassador():
    """Ambassador program page"""
    return render_template('ambassador.html')

@app.route('/api/waitlist', methods=['POST'])
def add_to_waitlist():
    """Add email to waitlist"""
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    
    if not email or '@' not in email:
        return jsonify({'success': False, 'message': 'Please enter a valid email address'}), 400
    
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute('INSERT INTO waitlist (email) VALUES (?)', (email,))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Successfully added to waitlist!'})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'This email is already on the waitlist'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': 'An error occurred. Please try again.'}), 500

@app.route('/api/ambassador', methods=['POST'])
def submit_ambassador_application():
    """Submit ambassador application"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'email', 'school', 'grade', 'community_access', 'why_interested', 'time_commitment']
    for field in required_fields:
        if not data.get(field, '').strip():
            return jsonify({'success': False, 'message': f'{field.replace("_", " ").title()} is required'}), 400
    
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute('''
            INSERT INTO ambassador_applications 
            (name, email, school, grade, community_access, why_interested, experience, time_commitment)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['name'].strip(),
            data['email'].strip().lower(),
            data['school'].strip(),
            data['grade'].strip(),
            data['community_access'].strip(),
            data['why_interested'].strip(),
            data.get('experience', '').strip(),
            data['time_commitment'].strip()
        ))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Application submitted successfully!'})
    except Exception as e:
        return jsonify({'success': False, 'message': 'An error occurred. Please try again.'}), 500

@app.route('/admin', methods=['GET', 'POST'])
def admin():
    """Admin panel with password protection"""
    if request.method == 'POST':
        password = request.form.get('password', '')
        if password == 'admin12345':
            session['admin_authenticated'] = True
            return redirect(url_for('admin'))
        else:
            flash('Incorrect password', 'error')
    
    # Check if authenticated
    if not session.get('admin_authenticated'):
        return render_template('admin_login.html')
    
    # Get filter parameter
    waitlist_filter = request.args.get('waitlist_filter', 'all')
    ambassador_filter = request.args.get('ambassador_filter', 'all')
    
    # Get waitlist entries with filter
    conn = get_db()
    c = conn.cursor()
    
    if waitlist_filter == 'sent':
        waitlist = c.execute('SELECT * FROM waitlist WHERE sent = 1 ORDER BY created_at DESC').fetchall()
    elif waitlist_filter == 'not_sent':
        waitlist = c.execute('SELECT * FROM waitlist WHERE sent = 0 ORDER BY created_at DESC').fetchall()
    else:
        waitlist = c.execute('SELECT * FROM waitlist ORDER BY created_at DESC').fetchall()
    
    if ambassador_filter == 'sent':
        applications = c.execute('SELECT * FROM ambassador_applications WHERE sent = 1 ORDER BY created_at DESC').fetchall()
    elif ambassador_filter == 'not_sent':
        applications = c.execute('SELECT * FROM ambassador_applications WHERE sent = 0 ORDER BY created_at DESC').fetchall()
    else:
        applications = c.execute('SELECT * FROM ambassador_applications ORDER BY created_at DESC').fetchall()
    
    conn.close()
    
    return render_template('admin.html', waitlist=waitlist, applications=applications, 
                         waitlist_filter=waitlist_filter, ambassador_filter=ambassador_filter)

@app.route('/admin/logout')
def admin_logout():
    """Logout from admin panel"""
    session.pop('admin_authenticated', None)
    return redirect(url_for('admin'))

@app.route('/api/admin/waitlist/<int:entry_id>/toggle-sent', methods=['POST'])
def toggle_waitlist_sent(entry_id):
    """Toggle sent status for a waitlist entry"""
    if not session.get('admin_authenticated'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        conn = get_db()
        c = conn.cursor()
        # Toggle sent status
        c.execute('UPDATE waitlist SET sent = NOT sent WHERE id = ?', (entry_id,))
        conn.commit()
        # Get updated status
        result = c.execute('SELECT sent FROM waitlist WHERE id = ?', (entry_id,)).fetchone()
        conn.close()
        return jsonify({'success': True, 'sent': bool(result['sent'])})
    except Exception as e:
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

@app.route('/api/admin/waitlist/<int:entry_id>/delete', methods=['POST'])
def delete_waitlist_entry(entry_id):
    """Delete a waitlist entry"""
    if not session.get('admin_authenticated'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute('DELETE FROM waitlist WHERE id = ?', (entry_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

@app.route('/api/admin/ambassador/<int:app_id>/toggle-sent', methods=['POST'])
def toggle_ambassador_sent(app_id):
    """Toggle sent status for an ambassador application"""
    if not session.get('admin_authenticated'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        conn = get_db()
        c = conn.cursor()
        # Toggle sent status
        c.execute('UPDATE ambassador_applications SET sent = NOT sent WHERE id = ?', (app_id,))
        conn.commit()
        # Get updated status
        result = c.execute('SELECT sent FROM ambassador_applications WHERE id = ?', (app_id,)).fetchone()
        conn.close()
        return jsonify({'success': True, 'sent': bool(result['sent'])})
    except Exception as e:
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

@app.route('/api/admin/ambassador/<int:app_id>/delete', methods=['POST'])
def delete_ambassador_application(app_id):
    """Delete an ambassador application"""
    if not session.get('admin_authenticated'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute('DELETE FROM ambassador_applications WHERE id = ?', (app_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

# Initialize database on startup
init_db()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(debug=False, host='0.0.0.0', port=port)

