# Token过期时间扩展修改总结

## 修改概述

本次修改将用户登录的token过期时间从7天延长到6个月（180天），让用户一次登录可以保持半年不用重新登录，并且在服务器重启后也能保持登录状态。

## 具体修改内容

### 1. 后端JWT配置修改

**文件**: `backend/app/utils/app_factory.py`

```python
# 修改前
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 900  # 15分钟
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = 604800  # 7天

# 修改后
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 3600  # 1小时
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = 15552000  # 6个月 (180天)
```

### 2. User模型token生成方法修改

**文件**: `backend/app/models/user.py`

```python
# 修改前
def generate_refresh_token(self, expires_in: int = 604800) -> str:
    """生成刷新Token (默认7天)"""

# 修改后
def generate_refresh_token(self, expires_in: int = 15552000) -> str:
    """生成刷新Token (默认6个月)"""
```

### 3. 登录路由修复

**文件**: `backend/app/routes/auth.py`

添加了数据库提交操作，确保refresh token被正确保存到数据库：

```python
# 生成Token
access_token = user.generate_access_token()
refresh_token = user.generate_refresh_token()

# 提交refresh token到数据库
db.session.commit()
```

## 技术细节

### Token过期时间设置

- **Access Token**: 1小时（3600秒）
  - 用于API访问认证
  - 较短的有效期保证安全性
  - 通过refresh token自动续期

- **Refresh Token**: 6个月（15552000秒）
  - 用于获取新的access token
  - 长期有效，减少用户重新登录频率
  - 存储在数据库中，服务器重启后仍然有效

### 安全性考虑

1. **Access Token短期有效**: 即使泄露，影响时间有限
2. **Refresh Token长期存储**: 存储在数据库中，可以随时撤销
3. **自动续期机制**: 前端自动使用refresh token获取新的access token
4. **服务器重启持久性**: refresh token存储在数据库中，服务器重启后仍然有效

## 测试验证

### 功能测试

1. ✅ 用户登录成功，获得access token和refresh token
2. ✅ 使用access token访问受保护的API资源
3. ✅ Refresh token功能正常工作，可以获取新的access token
4. ✅ 服务器重启后refresh token仍然有效
5. ✅ Refresh token过期时间设置为6个月（179天）

### 持久性测试

- 服务器重启后，refresh token仍然可以正常使用
- 数据库中的refresh token过期时间正确设置为6个月后
- 前端localStorage中的token在服务器重启后仍然有效

## 用户体验改进

### 修改前
- 用户每7天需要重新登录
- 服务器重启后需要重新登录

### 修改后
- 用户一次登录可以保持6个月
- 服务器重启后自动保持登录状态
- 减少用户登录频率，提升用户体验

## 兼容性

- 前端代码无需修改，现有的token处理逻辑完全兼容
- 现有的refresh token机制继续工作
- 不影响现有的用户认证流程

## 部署注意事项

1. 确保数据库连接正常，refresh token需要持久化存储
2. 建议在生产环境中使用PostgreSQL等持久化数据库
3. 定期清理过期的refresh token（可选）

## 总结

通过本次修改，成功实现了：
- ✅ 用户登录状态保持6个月
- ✅ 服务器重启后保持登录状态
- ✅ 保持系统安全性
- ✅ 提升用户体验
- ✅ 向后兼容现有功能
