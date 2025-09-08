import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import jwt
import os
from typing import Optional

def send_verification_email(to_email: str, verification_token: str) -> bool:
    """发送邮箱验证邮件"""
    try:
        # 获取邮件配置
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_username = os.getenv('SMTP_USERNAME')
        smtp_password = os.getenv('SMTP_PASSWORD')
        
        if not all([smtp_username, smtp_password]):
            print(f"邮件配置不完整，跳过发送验证邮件到 {to_email}")
            return True  # 在开发环境中返回True，不阻塞注册流程
        
        # 构建验证链接
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        verification_url = f"{frontend_url}/verify-email?token={verification_token}"
        
        # 创建邮件内容
        subject = "AIGTD - 邮箱验证"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>邮箱验证</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .container {{
                    background-color: #f8f9fa;
                    border-radius: 8px;
                    padding: 30px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .logo {{
                    font-size: 24px;
                    font-weight: bold;
                    color: #007bff;
                    margin-bottom: 10px;
                }}
                .verification-button {{
                    display: inline-block;
                    background-color: #007bff;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    margin: 20px 0;
                }}
                .verification-button:hover {{
                    background-color: #0056b3;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #dee2e6;
                    font-size: 14px;
                    color: #6c757d;
                }}
                .warning {{
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 4px;
                    padding: 12px;
                    margin: 20px 0;
                    color: #856404;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">AIGTD</div>
                    <h1>欢迎加入 AIGTD！</h1>
                </div>
                
                <p>您好，</p>
                
                <p>感谢您注册 AIGTD 账户。为了确保账户安全，请验证您的邮箱地址。</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_url}" class="verification-button">
                        验证邮箱地址
                    </a>
                </div>
                
                <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
                <p style="word-break: break-all; background-color: #e9ecef; padding: 10px; border-radius: 4px;">
                    {verification_url}
                </p>
                
                <div class="warning">
                    <strong>重要提示：</strong>
                    <ul>
                        <li>此验证链接将在24小时后过期</li>
                        <li>如果这不是您本人操作，请忽略此邮件</li>
                        <li>请勿将此链接分享给他人</li>
                    </ul>
                </div>
                
                <div class="footer">
                    <p>此邮件由 AIGTD 系统自动发送，请勿回复。</p>
                    <p>如有疑问，请联系我们的客服团队。</p>
                    <p>&copy; 2024 AIGTD. 保留所有权利。</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # 纯文本版本
        text_content = f"""
        AIGTD - 邮箱验证
        
        您好，
        
        感谢您注册 AIGTD 账户。为了确保账户安全，请验证您的邮箱地址。
        
        请点击以下链接完成验证：
        {verification_url}
        
        重要提示：
        - 此验证链接将在24小时后过期
        - 如果这不是您本人操作，请忽略此邮件
        - 请勿将此链接分享给他人
        
        此邮件由 AIGTD 系统自动发送，请勿回复。
        
        &copy; 2024 AIGTD. 保留所有权利。
        """
        
        # 创建邮件消息
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = smtp_username
        msg['To'] = to_email
        
        # 添加HTML和纯文本内容
        html_part = MIMEText(html_content, 'html', 'utf-8')
        text_part = MIMEText(text_content, 'plain', 'utf-8')
        
        msg.attach(text_part)
        msg.attach(html_part)
        
        # 发送邮件
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()  # 启用TLS加密
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
        
        print(f"验证邮件已发送到 {to_email}")
        return True
        
    except Exception as e:
        print(f"发送验证邮件失败: {e}")
        return False

def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """发送密码重置邮件"""
    try:
        # 获取邮件配置
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_username = os.getenv('SMTP_USERNAME')
        smtp_password = os.getenv('SMTP_PASSWORD')
        
        if not all([smtp_username, smtp_password]):
            print(f"邮件配置不完整，跳过发送密码重置邮件到 {to_email}")
            return True  # 在开发环境中返回True，不阻塞流程
        
        # 构建重置链接
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        reset_url = f"{frontend_url}/reset-password?token={reset_token}"
        
        # 创建邮件内容
        subject = "AIGTD - 密码重置"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>密码重置</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .container {{
                    background-color: #f8f9fa;
                    border-radius: 8px;
                    padding: 30px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .logo {{
                    font-size: 24px;
                    font-weight: bold;
                    color: #dc3545;
                    margin-bottom: 10px;
                }}
                .reset-button {{
                    display: inline-block;
                    background-color: #dc3545;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    margin: 20px 0;
                }}
                .reset-button:hover {{
                    background-color: #c82333;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #dee2e6;
                    font-size: 14px;
                    color: #6c757d;
                }}
                .warning {{
                    background-color: #f8d7da;
                    border: 1px solid #f5c6cb;
                    border-radius: 4px;
                    padding: 12px;
                    margin: 20px 0;
                    color: #721c24;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">AIGTD</div>
                    <h1>密码重置请求</h1>
                </div>
                
                <p>您好，</p>
                
                <p>我们收到了您的密码重置请求。请点击下面的按钮重置您的密码：</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" class="reset-button">
                        重置密码
                    </a>
                </div>
                
                <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
                <p style="word-break: break-all; background-color: #e9ecef; padding: 10px; border-radius: 4px;">
                    {reset_url}
                </p>
                
                <div class="warning">
                    <strong>安全提示：</strong>
                    <ul>
                        <li>此重置链接将在1小时后过期</li>
                        <li>如果这不是您本人操作，请忽略此邮件</li>
                        <li>重置密码后，所有设备上的登录状态将被清除</li>
                        <li>建议您使用强密码并定期更换</li>
                    </ul>
                </div>
                
                <div class="footer">
                    <p>此邮件由 AIGTD 系统自动发送，请勿回复。</p>
                    <p>如有疑问，请联系我们的客服团队。</p>
                    <p>&copy; 2024 AIGTD. 保留所有权利。</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # 纯文本版本
        text_content = f"""
        AIGTD - 密码重置
        
        您好，
        
        我们收到了您的密码重置请求。请点击以下链接重置您的密码：
        {reset_url}
        
        安全提示：
        - 此重置链接将在1小时后过期
        - 如果这不是您本人操作，请忽略此邮件
        - 重置密码后，所有设备上的登录状态将被清除
        - 建议您使用强密码并定期更换
        
        此邮件由 AIGTD 系统自动发送，请勿回复。
        
        &copy; 2024 AIGTD. 保留所有权利。
        """
        
        # 创建邮件消息
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = smtp_username
        msg['To'] = to_email
        
        # 添加HTML和纯文本内容
        html_part = MIMEText(html_content, 'html', 'utf-8')
        text_part = MIMEText(text_content, 'plain', 'utf-8')
        
        msg.attach(text_part)
        msg.attach(html_part)
        
        # 发送邮件
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()  # 启用TLS加密
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
        
        print(f"密码重置邮件已发送到 {to_email}")
        return True
        
    except Exception as e:
        print(f"发送密码重置邮件失败: {e}")
        return False

def generate_reset_token(user_id: int, expires_in: int = 3600) -> str:
    """生成密码重置Token"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(seconds=expires_in),
        'iat': datetime.utcnow(),
        'type': 'password_reset'
    }
    
    from flask import current_app
    return jwt.encode(payload, current_app.config.get('JWT_SECRET_KEY', 'your-secret-key-here'), algorithm='HS256')

def verify_reset_token(token: str) -> Optional[int]:
    """验证密码重置Token"""
    try:
        from flask import current_app
        payload = jwt.decode(token, current_app.config.get('JWT_SECRET_KEY', 'your-secret-key-here'), algorithms=['HS256'])
        
        if payload.get('type') != 'password_reset':
            return None
            
        return payload.get('user_id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# 导出函数
__all__ = [
    'send_verification_email',
    'send_password_reset_email',
    'generate_reset_token',
    'verify_reset_token'
]