#!/usr/bin/env python3
"""
数据库架构部署脚本
用于部署PostgreSQL和SQLite的完整随机ID架构
"""

import os
import sys
import subprocess
from pathlib import Path

project_root = Path(__file__).parent

def deploy_postgresql_schema():
    """部署PostgreSQL架构"""
    print("部署PostgreSQL随机ID架构...")
    
    schema_file = project_root / "schema_postgresql_random_ids.sql"
    if not schema_file.exists():
        print(f"❌ PostgreSQL架构文件不存在: {schema_file}")
        return False
    
    try:
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            print("❌ 未设置DATABASE_URL环境变量")
            return False
        
        # 使用psql执行架构文件
        result = subprocess.run([
            'psql', database_url, '-f', str(schema_file)
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ PostgreSQL架构部署成功")
            print(f"输出: {result.stdout}")
            return True
        else:
            print(f"❌ PostgreSQL架构部署失败: {result.stderr}")
            return False
            
    except FileNotFoundError:
        print("❌ 未找到psql命令，请确保PostgreSQL客户端已安装")
        return False
    except Exception as e:
        print(f"❌ PostgreSQL部署异常: {e}")
        return False

def deploy_sqlite_schema():
    """部署SQLite架构"""
    print("部署SQLite随机ID架构...")
    
    schema_file = project_root / "schema_sqlite_random_ids.sql"
    if not schema_file.exists():
        print(f"❌ SQLite架构文件不存在: {schema_file}")
        return False
    
    try:
        # 确定数据库文件路径
        data_dir = project_root.parent / "data"
        data_dir.mkdir(exist_ok=True)
        db_path = data_dir / "aigtd_random_ids.db"
        
        # 如果文件存在，备份
        if db_path.exists():
            import time
            backup_path = data_dir / f"aigtd_backup_{int(time.time())}.db"
            import shutil
            shutil.copy2(str(db_path), str(backup_path))
            print(f"已备份现有数据库到: {backup_path}")
        
        # 使用sqlite3执行架构文件
        result = subprocess.run([
            'sqlite3', str(db_path), f'.read {schema_file}'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ SQLite架构部署成功")
            print(f"数据库文件: {db_path}")
            return True
        else:
            print(f"❌ SQLite架构部署失败: {result.stderr}")
            return False
            
    except FileNotFoundError:
        print("❌ 未找到sqlite3命令，请确保SQLite已安装")
        return False
    except Exception as e:
        print(f"❌ SQLite部署异常: {e}")
        return False

def verify_deployment():
    """验证部署结果"""
    print("\n验证部署结果...")
    
    # 检测数据库类型
    database_url = os.getenv('DATABASE_URL', '')
    is_postgresql = 'postgresql' in database_url.lower() or 'supabase' in database_url.lower()
    
    try:
        if is_postgresql:
            # 验证PostgreSQL
            result = subprocess.run([
                'psql', database_url, '-c', 
                "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
            ], capture_output=True, text=True)
            
            if 'users' in result.stdout and 'records' in result.stdout:
                print("✅ PostgreSQL表结构验证成功")
                return True
            else:
                print("❌ PostgreSQL表结构验证失败")
                return False
        else:
            # 验证SQLite
            data_dir = project_root.parent / "data"
            db_path = data_dir / "aigtd_random_ids.db"
            
            if not db_path.exists():
                print("❌ SQLite数据库文件不存在")
                return False
            
            result = subprocess.run([
                'sqlite3', str(db_path), '.tables'
            ], capture_output=True, text=True)
            
            if 'users' in result.stdout and 'records' in result.stdout:
                print("✅ SQLite表结构验证成功")
                return True
            else:
                print("❌ SQLite表结构验证失败")
                return False
                
    except Exception as e:
        print(f"❌ 验证过程异常: {e}")
        return False

def show_usage():
    """显示使用说明"""
    print("""
数据库架构部署脚本使用说明：

1. PostgreSQL部署：
   export DATABASE_URL="postgresql://user:password@host:port/database"
   python deploy_schema.py postgresql

2. SQLite部署：
   python deploy_schema.py sqlite

3. 自动检测部署：
   python deploy_schema.py auto

4. 查看架构文件：
   python deploy_schema.py show

注意事项：
- PostgreSQL需要psql命令可用
- SQLite需要sqlite3命令可用
- 部署前会自动备份现有数据
- 建议在测试环境先验证
""")

def show_schema_info():
    """显示架构信息"""
    print("=" * 60)
    print("随机ID数据库架构信息")
    print("=" * 60)
    
    postgresql_file = project_root / "schema_postgresql_random_ids.sql"
    sqlite_file = project_root / "schema_sqlite_random_ids.sql"
    
    print(f"PostgreSQL架构文件: {postgresql_file}")
    print(f"文件大小: {postgresql_file.stat().st_size if postgresql_file.exists() else 0} bytes")
    
    print(f"SQLite架构文件: {sqlite_file}")
    print(f"文件大小: {sqlite_file.stat().st_size if sqlite_file.exists() else 0} bytes")
    
    print("\n主要特性:")
    print("- 48位随机ID主键")
    print("- 父子任务层级关系")
    print("- 完整约束检查")
    print("- 自动时间戳更新")
    print("- 性能优化索引")
    print("- 数据完整性检查")

def main():
    """主函数"""
    if len(sys.argv) < 2:
        show_usage()
        return
    
    command = sys.argv[1].lower()
    
    if command == 'postgresql':
        success = deploy_postgresql_schema()
    elif command == 'sqlite':
        success = deploy_sqlite_schema()
    elif command == 'auto':
        # 自动检测数据库类型
        database_url = os.getenv('DATABASE_URL', '')
        if 'postgresql' in database_url.lower() or 'supabase' in database_url.lower():
            success = deploy_postgresql_schema()
        else:
            success = deploy_sqlite_schema()
    elif command == 'show':
        show_schema_info()
        return
    elif command == 'verify':
        success = verify_deployment()
    else:
        show_usage()
        return
    
    if success and command != 'verify':
        verify_deployment()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 部署成功完成！")
        print("\n下一步:")
        print("1. 使用应用程序连接新数据库")
        print("2. 通过RandomIDGenerator创建数据")
        print("3. 测试导入导出功能")
        print("4. 验证父子任务关系")
    else:
        print("❌ 部署失败，请检查错误信息")

if __name__ == "__main__":
    main()