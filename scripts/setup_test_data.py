#!/usr/bin/env python3
"""
Setup test data including admin user
"""

import sys
import os
sys.path.append('/Users/yiling/git/AIGTD/backend')

from app.models.user import User
from app.models.record import Record, db
from app.database.init import init_database
from flask import Flask

def create_test_app():
    """Create Flask app for testing"""
    app = Flask(__name__)
    app.config['JWT_SECRET_KEY'] = 'your-secret-key-here'
    init_database(app)
    return app

def setup_admin_user():
    """Create admin user if not exists"""
    print("Setting up admin user...")
    
    # Check if admin exists
    admin = User.find_by_username('admin')
    if admin:
        # Update existing admin
        admin.is_admin = True
        admin.is_active = True
        db.session.commit()
        print("Updated existing admin user")
    else:
        # Create new admin
        admin = User.create_user(
            username='admin',
            email='admin@example.com', 
            password='AdminPass123!',
            first_name='Admin',
            last_name='User'
        )
        admin.is_admin = True
        admin.is_active = True
        db.session.commit()
        print("Created new admin user")
    
    return admin

def setup_test_data():
    """Create test records"""
    print("Setting up test records...")
    
    # Get admin and regular user
    admin = User.find_by_username('admin')
    user = User.find_by_username('testuser')
    
    # Create admin record
    if admin:
        admin_record = Record(
            content="管理员创建的记录",
            category='note',
            user_id=admin.id
        )
        db.session.add(admin_record)
    
    # Create user record if user exists
    if user:
        user_record = Record(
            content="普通用户创建的记录",
            category='task',
            user_id=user.id
        )
        db.session.add(user_record)
    
    # Create guest record
    guest_record = Record(
        content="游客创建的公共记录",
        category='general',
        user_id=None
    )
    db.session.add(guest_record)
    
    db.session.commit()
    print("Test records created")

def main():
    app = create_test_app()
    
    with app.app_context():
        try:
            # Setup admin user
            admin = setup_admin_user()
            print(f"Admin user: {admin.username} (ID: {admin.id})")
            
            # Setup test data
            setup_test_data()
            
            print("Test setup complete!")
            
        except Exception as e:
            print(f"Error during setup: {e}")
            db.session.rollback()

if __name__ == "__main__":
    main()