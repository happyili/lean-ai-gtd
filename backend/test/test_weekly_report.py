#!/usr/bin/env python3
"""
周报功能测试
测试周报API的数据获取和AI分析功能
"""

import sys
import os
import unittest
import json
from datetime import datetime, timezone, timedelta

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app
from app.database import db
from app.models.user import User
from app.models.record import Record
# 不再导入generate_tokens，直接使用User模型的方法

class WeeklyReportTestCase(unittest.TestCase):
    
    def setUp(self):
        """测试前的设置"""
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        
        with self.app.app_context():
            # 创建测试用户
            self.test_user = User(
                username='test_weekly_user',
                email='test_weekly@example.com'
            )
            self.test_user.set_password('test123')
            db.session.add(self.test_user)
            db.session.commit()
            
            # 生成访问令牌
            self.access_token = self.test_user.generate_access_token()
            
            # 创建测试数据
            self.create_test_data()
    
    def tearDown(self):
        """测试后的清理"""
        with self.app.app_context():
            # 清理测试数据
            Record.query.filter_by(user_id=self.test_user.id).delete()
            db.session.delete(self.test_user)
            db.session.commit()
    
    def create_test_data(self):
        """创建测试数据"""
        now = datetime.now(timezone.utc)
        
        # 计算本周一
        current_monday = now - timedelta(days=now.weekday())
        current_monday = current_monday.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # 本周新增任务
        self.new_task_1 = Record(
            content='本周新增工作任务1',
            category='task',
            task_type='work',
            priority='high',
            user_id=self.test_user.id,
            created_at=current_monday + timedelta(days=1),
            updated_at=current_monday + timedelta(days=1)
        )
        
        self.new_task_2 = Record(
            content='本周新增生活任务1',
            category='task',
            task_type='life',
            priority='medium',
            user_id=self.test_user.id,
            created_at=current_monday + timedelta(days=2),
            updated_at=current_monday + timedelta(days=2)
        )
        
        # 本周完成的任务（上周创建，本周完成）
        self.completed_task = Record(
            content='本周完成的任务',
            category='task',
            task_type='work',
            priority='medium',
            status='completed',
            user_id=self.test_user.id,
            created_at=current_monday - timedelta(days=3),  # 上周创建
            updated_at=current_monday + timedelta(days=3)   # 本周完成
        )
        
        # 状态变更的任务
        self.status_changed_task = Record(
            content='状态变更的任务',
            category='task',
            task_type='hobby',
            priority='high',
            status='paused',
            user_id=self.test_user.id,
            created_at=current_monday - timedelta(days=5),  # 上周创建
            updated_at=current_monday + timedelta(days=2)   # 本周变更状态
        )
        
        # 本周删除的任务
        self.deleted_task = Record(
            content='本周删除的任务',
            category='task',
            task_type='work',
            priority='low',
            status='deleted',
            user_id=self.test_user.id,
            created_at=current_monday - timedelta(days=7),  # 上周创建
            updated_at=current_monday + timedelta(days=4)   # 本周删除
        )
        
        # 停滞的高优先级任务
        self.stagnant_task = Record(
            content='停滞的高优先级任务',
            category='task',
            task_type='work',
            priority='urgent',
            status='active',
            user_id=self.test_user.id,
            created_at=current_monday - timedelta(days=20),  # 20天前创建
            updated_at=current_monday - timedelta(days=10)   # 10天前最后更新
        )
        
        # 频繁变更的任务（创建后很快删除）
        self.frequent_change_task = Record(
            content='频繁变更的任务',
            category='task',
            task_type='life',
            priority='medium',
            status='deleted',
            user_id=self.test_user.id,
            created_at=current_monday + timedelta(days=1),   # 本周创建
            updated_at=current_monday + timedelta(days=2)    # 很快删除
        )
        
        # 添加所有测试数据到数据库
        test_records = [
            self.new_task_1, self.new_task_2, self.completed_task,
            self.status_changed_task, self.deleted_task, self.stagnant_task,
            self.frequent_change_task
        ]
        
        for record in test_records:
            db.session.add(record)
        
        db.session.commit()
        
        # 为部分任务添加子任务
        subtask = Record(
            content='完成任务的子任务',
            category='task',
            task_type='work',
            priority='medium',
            status='completed',
            parent_id=self.completed_task.id,
            user_id=self.test_user.id,
            created_at=self.completed_task.created_at,
            updated_at=self.completed_task.updated_at
        )
        db.session.add(subtask)
        db.session.commit()
    
    def test_get_weekly_report_current_week(self):
        """测试获取本周周报"""
        response = self.client.get(
            '/api/weekly-report?task_type=all&week_offset=0',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        self.assertTrue(data['success'])
        report_data = data['data']
        
        # 验证周信息
        self.assertEqual(report_data['week_info']['week_offset'], 0)
        self.assertTrue(report_data['week_info']['is_current_week'])
        self.assertEqual(report_data['task_type_filter'], 'all')
        
        # 验证统计数据
        summary = report_data['summary']
        self.assertEqual(summary['total_new'], 2)  # new_task_1, new_task_2
        self.assertEqual(summary['total_completed'], 1)  # completed_task
        self.assertEqual(summary['total_status_changed'], 1)  # status_changed_task
        self.assertEqual(summary['total_deleted'], 2)  # deleted_task, frequent_change_task
        self.assertEqual(summary['stagnant_high_priority_count'], 1)  # stagnant_task
        self.assertEqual(summary['frequent_changes_count'], 1)  # frequent_change_task
        
        # 验证新增任务
        new_tasks = report_data['new_tasks']
        self.assertEqual(len(new_tasks), 2)
        task_contents = [task['content'] for task in new_tasks]
        self.assertIn('本周新增工作任务1', task_contents)
        self.assertIn('本周新增生活任务1', task_contents)
        
        # 验证完成任务
        completed_tasks = report_data['completed_tasks']
        self.assertEqual(len(completed_tasks), 1)
        self.assertEqual(completed_tasks[0]['content'], '本周完成的任务')
        self.assertTrue(completed_tasks[0]['subtask_count'] > 0)  # 有子任务
        
        # 验证停滞任务
        stagnant_tasks = report_data['stagnant_high_priority']
        self.assertEqual(len(stagnant_tasks), 1)
        self.assertEqual(stagnant_tasks[0]['task']['content'], '停滞的高优先级任务')
        self.assertTrue(stagnant_tasks[0]['days_stagnant'] > 7)
        
        print("✅ 本周周报数据获取测试通过")
    
    def test_get_weekly_report_with_task_type_filter(self):
        """测试按任务类型过滤的周报"""
        response = self.client.get(
            '/api/weekly-report?task_type=work&week_offset=0',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        self.assertTrue(data['success'])
        report_data = data['data']
        
        # 验证过滤器
        self.assertEqual(report_data['task_type_filter'], 'work')
        
        # 验证只包含工作类型的任务
        all_tasks = (report_data['new_tasks'] + 
                    report_data['completed_tasks'] + 
                    report_data['status_changed_tasks'] + 
                    report_data['deleted_tasks'])
        
        for task in all_tasks:
            if task['task_type']:  # 有些任务可能没有设置task_type
                self.assertEqual(task['task_type'], 'work')
        
        print("✅ 任务类型过滤测试通过")
    
    def test_get_weekly_report_last_week(self):
        """测试获取上周周报"""
        response = self.client.get(
            '/api/weekly-report?task_type=all&week_offset=-1',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        self.assertTrue(data['success'])
        report_data = data['data']
        
        # 验证周信息
        self.assertEqual(report_data['week_info']['week_offset'], -1)
        self.assertFalse(report_data['week_info']['is_current_week'])
        
        # 上周应该没有本周的新增任务
        self.assertEqual(len(report_data['new_tasks']), 0)
        
        print("✅ 上周周报数据获取测试通过")
    
    def test_generate_ai_analysis(self):
        """测试生成AI分析"""
        # 首先获取周报数据
        response = self.client.get(
            '/api/weekly-report?task_type=all&week_offset=0',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        
        self.assertEqual(response.status_code, 200)
        report_data = json.loads(response.data)['data']
        
        # 生成AI分析
        response = self.client.post(
            '/api/weekly-report/ai-analysis',
            json={
                'report_data': report_data,
                'custom_context': '这是测试上下文'
            },
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        
        # 由于AI服务可能不可用，我们只检查请求格式是否正确
        # 如果AI服务不可用，应该返回错误信息而不是崩溃
        self.assertIn(response.status_code, [200, 500])
        
        data = json.loads(response.data)
        if response.status_code == 200:
            self.assertTrue(data['success'])
            self.assertIn('ai_analysis', data)
            print("✅ AI分析生成成功")
        else:
            self.assertFalse(data['success'])
            self.assertIn('error', data)
            print("⚠️  AI服务不可用，但错误处理正确")
    
    def test_unauthorized_access(self):
        """测试未授权访问"""
        response = self.client.get('/api/weekly-report')
        self.assertEqual(response.status_code, 401)
        
        response = self.client.post('/api/weekly-report/ai-analysis')
        self.assertEqual(response.status_code, 401)
        
        print("✅ 未授权访问测试通过")
    
    def test_invalid_parameters(self):
        """测试无效参数"""
        # 测试无效的week_offset
        response = self.client.get(
            '/api/weekly-report?week_offset=invalid',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        # 应该返回错误或使用默认值
        self.assertIn(response.status_code, [200, 400])
        
        # 测试AI分析缺少数据
        response = self.client.post(
            '/api/weekly-report/ai-analysis',
            json={},
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertFalse(data['success'])
        
        print("✅ 无效参数测试通过")

def run_weekly_report_tests():
    """运行周报功能测试"""
    print("🧪 开始周报功能测试...")
    
    # 创建测试套件
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(WeeklyReportTestCase)
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 输出测试结果
    if result.wasSuccessful():
        print(f"\n🎉 所有周报测试通过! 运行了 {result.testsRun} 个测试")
        return True
    else:
        print(f"\n❌ 有 {len(result.failures)} 个测试失败, {len(result.errors)} 个测试错误")
        
        # 打印失败详情
        for test, traceback in result.failures:
            print(f"\n失败测试: {test}")
            print(f"错误信息: {traceback}")
        
        for test, traceback in result.errors:
            print(f"\n错误测试: {test}")
            print(f"错误信息: {traceback}")
        
        return False

if __name__ == '__main__':
    success = run_weekly_report_tests()
    sys.exit(0 if success else 1)
