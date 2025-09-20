import * as XLSX from 'xlsx';
import { buildUrl, handleApiError } from './api';

// 任务数据类型
export interface TaskRecord {
  id: number;
  content: string;
  category: string;
  parent_id?: number;
  priority?: string;
  progress_notes?: string;
  created_at: string;
  updated_at: string;
  status: string;
  task_type?: string;
  subtask_count?: number;
  subtasks?: TaskRecord[];
  user_id?: number | null;
  tags?: string;
  estimated_time?: number;
}

// 导出数据格式
export interface ExportTaskData {
  任务ID: string;
  任务内容: string;
  任务类型: string;
  优先级: string;
  状态: string;
  进展记录: string;
  标签: string;
  预估时间: string;
  父任务ID: string;
  子任务数量: number;
  创建时间: string;
  更新时间: string;
}

// 获取所有任务数据
export const fetchAllTasks = async (accessToken?: string): Promise<TaskRecord[]> => {
  try {
    const params = {
      category: 'task',
      include_subtasks: true,
      subtask_detail: true,
      top_level_only: false,
      per_page: 10000, // 获取所有任务
      page: 1
    };

    const url = buildUrl('/api/records', params);
    const headers: HeadersInit = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const response = await handleApiError(
      await fetch(url, { headers }),
      '获取任务数据'
    );
    
    const data = await response.json();
    return data.records || [];
  } catch (error) {
    console.error('获取任务数据失败:', error);
    throw error;
  }
};

// 转换任务数据为导出格式
export const convertTasksToExportFormat = (tasks: TaskRecord[]): ExportTaskData[] => {
  const taskTypeMap: { [key: string]: string } = {
    'work': '工作',
    'hobby': '业余',
    'life': '生活'
  };

  const priorityMap: { [key: string]: string } = {
    'urgent': '紧急',
    'high': '高',
    'medium': '中',
    'low': '低'
  };

  const statusMap: { [key: string]: string } = {
    'pending': '待办',
    'active': '进行中',
    'completed': '已完成',
    'paused': '暂停',
    'cancelled': '已取消'
  };

  // 处理所有任务（包括主任务和子任务）
  const processedTasks: ExportTaskData[] = [];

  const processTask = (task: TaskRecord) => {
    const exportData: ExportTaskData = {
      任务ID: task.id?.toString() || '',
      任务内容: task.content,
      任务类型: taskTypeMap[task.task_type || ''] || task.task_type || '工作',
      优先级: priorityMap[task.priority || ''] || task.priority || '中',
      状态: statusMap[task.status] || task.status || '待办',
      进展记录: task.progress_notes || '',
      标签: task.tags || '',
      预估时间: task.estimated_time ? `${task.estimated_time}分钟` : '',
      父任务ID: task.parent_id ? task.parent_id.toString() : '',
      子任务数量: task.subtask_count || 0,
      创建时间: new Date(task.created_at).toLocaleString('zh-CN'),
      更新时间: new Date(task.updated_at).toLocaleString('zh-CN')
    };
    
    processedTasks.push(exportData);

    // 递归处理子任务
    if (task.subtasks && task.subtasks.length > 0) {
      task.subtasks.forEach(subtask => processTask(subtask));
    }
  };

  tasks.forEach(task => processTask(task));
  return processedTasks;
};

// 导出任务到Excel
export const exportTasksToExcel = async (accessToken?: string): Promise<void> => {
  try {
    // 获取任务数据
    const tasks = await fetchAllTasks(accessToken);
    
    if (tasks.length === 0) {
      throw new Error('没有可导出的任务数据');
    }

    // 转换数据格式
    const exportData = convertTasksToExportFormat(tasks);

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // 设置列宽
    const columnWidths = [
      { wch: 10 }, // 任务ID
      { wch: 30 }, // 任务内容
      { wch: 10 }, // 任务类型
      { wch: 8 },  // 优先级
      { wch: 10 }, // 状态
      { wch: 40 }, // 进展记录
      { wch: 20 }, // 标签
      { wch: 12 }, // 预估时间
      { wch: 12 }, // 父任务ID
      { wch: 12 }, // 子任务数量
      { wch: 18 }, // 创建时间
      { wch: 18 }  // 更新时间
    ];
    worksheet['!cols'] = columnWidths;

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, '任务列表');

    // 生成文件名
    const now = new Date();
    const filename = `任务导出_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}.xlsx`;

    // 导出文件
    XLSX.writeFile(workbook, filename);
    
  } catch (error) {
    console.error('导出任务失败:', error);
    throw error;
  }
};

// 导入任务数据格式
export interface ImportTaskData {
  content: string;
  category: string;
  priority: string;
  task_type: string;
  status: string;
  progress_notes: string;
  tags: string;
  estimated_time?: number;
  parent_id?: number;
}

// 从Excel导入任务数据
export const importTasksFromExcel = async (file: File, accessToken?: string): Promise<{ 
  success: number; 
  skipped: number; 
  errors: string[]; 
  details: string[] 
}> => {
  try {
    // 读取Excel文件
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    
    // 获取第一个工作表
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Excel文件中没有找到工作表');
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    if (!jsonData || jsonData.length === 0) {
      throw new Error('Excel文件为空或没有有效数据');
    }

    // 验证数据格式
    const validation = validateImportData(jsonData);
    if (!validation.valid) {
      throw new Error(`数据验证失败:\n${validation.errors.join('\n')}`);
    }

    // 获取现有任务用于重复检测
    const existingTasks = await fetchAllTasks(accessToken);
    const existingTaskContents = new Set(existingTasks.map(task => task.content.trim().toLowerCase()));

    // 检测是否包含“任务ID”列，用于跨库还原父子关系
    const hasOriginalId = !!(jsonData[0] as any)['任务ID'];

    // 转换并导入数据
    const results = {
      success: 0,
      skipped: 0,
      errors: [] as string[],
      details: [] as string[]
    };

    if (!hasOriginalId) {
      // 兼容旧版：逐行直接使用父任务ID作为现有数据库ID
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as any;
        const rowNumber = i + 2;
        try {
          const importData = convertImportRowToTaskData(row);
          const contentToCheck = importData.content.trim().toLowerCase();
          if (existingTaskContents.has(contentToCheck)) {
            results.skipped++;
            results.details.push(`第${rowNumber}行: "${importData.content}" 已存在，跳过`);
            continue;
          }
          await createTaskFromImport(importData, accessToken);
          existingTaskContents.add(contentToCheck);
          results.success++;
          results.details.push(`第${rowNumber}行: "${importData.content}" 导入成功`);
        } catch (error) {
          results.errors.push(`第${rowNumber}行导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
    } else {
      // 新版：使用“任务ID/父任务ID”为原始ID，构建 parent 映射后再导入
      type PendingRow = { row: any; rowNumber: number; importData: ReturnType<typeof convertImportRowToTaskData>; originalId?: number; parentOriginalId?: number };
      const rows: PendingRow[] = jsonData.map((row: any, idx: number) => {
        const originalId = row['任务ID'] ? parseInt(String(row['任务ID'])) : undefined;
        const parentOriginalId = row['父任务ID'] ? parseInt(String(row['父任务ID'])) : undefined;
        return { row, rowNumber: idx + 2, importData: convertImportRowToTaskData(row), originalId, parentOriginalId };
      });

      const idMap = new Map<number, number>(); // 原始ID -> 新ID
      const imported = new Set<number>();

      let progress = true;
      let passes = 0;
      while (progress && imported.size < rows.length && passes < rows.length + 2) {
        progress = false;
        passes++;

        for (const item of rows) {
          if (item.originalId && imported.has(item.originalId)) continue;

          try {
            const contentToCheck = item.importData.content.trim().toLowerCase();
            if (existingTaskContents.has(contentToCheck)) {
              // 标记为已处理（跳过）
              if (item.originalId) imported.add(item.originalId);
              results.skipped++;
              results.details.push(`第${item.rowNumber}行: "${item.importData.content}" 已存在，跳过`);
              progress = true;
              continue;
            }

            // 判断是否可创建（无父任务，或父任务已映射）
            const canCreate = !item.parentOriginalId || idMap.has(item.parentOriginalId);
            if (!canCreate) continue;

            // 根据是否有父任务创建
            const parentNewId = item.parentOriginalId ? idMap.get(item.parentOriginalId) : undefined;
            const createdId = await createTaskFromImportWithParent(item.importData, parentNewId, accessToken);

            // 记录映射和结果
            existingTaskContents.add(contentToCheck);
            if (item.originalId) {
              idMap.set(item.originalId, createdId);
              imported.add(item.originalId);
            }
            results.success++;
            results.details.push(`第${item.rowNumber}行: "${item.importData.content}" 导入成功`);
            progress = true;
          } catch (error) {
            // 暂不记录错误，等待后续pass再尝试（父任务可能未创建）
            continue;
          }
        }
      }

      // 对仍未导入的行记录错误
      for (const item of rows) {
        if (!item.originalId || imported.has(item.originalId)) continue;
        results.errors.push(`第${item.rowNumber}行导入失败: 未能解析父任务或创建失败`);
      }
    }

    return results;

  } catch (error) {
    throw new Error(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

// 将Excel行数据转换为任务数据格式
export const convertImportRowToTaskData = (row: any): ImportTaskData => {
  // 类型映射（中文 -> 英文）
  const taskTypeReverseMap: { [key: string]: string } = {
    '工作': 'work',
    '业余': 'hobby',
    '生活': 'life'
  };

  const priorityReverseMap: { [key: string]: string } = {
    '紧急': 'urgent',
    '高': 'high',
    '中': 'medium',
    '低': 'low'
  };

  const statusReverseMap: { [key: string]: string } = {
    '待办': 'pending',
    '进行中': 'active',
    '已完成': 'completed',
    '暂停': 'paused',
    '已取消': 'cancelled'
  };

  // 解析预估时间
  let estimatedTime: number | undefined;
  if (row['预估时间']) {
    const timeStr = row['预估时间'].toString();
    const match = timeStr.match(/(\d+)/);
    if (match) {
      estimatedTime = parseInt(match[1]);
    }
  }

  // 解析父任务ID
  let parentId: number | undefined;
  if (row['父任务ID'] && row['父任务ID'].toString().trim() !== '') {
    const idStr = row['父任务ID'].toString();
    const parsedId = parseInt(idStr);
    if (!isNaN(parsedId)) {
      parentId = parsedId;
    }
  }

  return {
    content: row['任务内容'] ? row['任务内容'].toString().trim() : '',
    category: 'task',
    task_type: taskTypeReverseMap[row['任务类型']] || 'work',
    priority: priorityReverseMap[row['优先级']] || 'medium',
    status: statusReverseMap[row['状态']] || 'pending',
    progress_notes: row['进展记录'] ? row['进展记录'].toString() : '',
    tags: row['标签'] ? row['标签'].toString() : '',
    estimated_time: estimatedTime,
    parent_id: parentId
  };
};

// 创建导入的任务
const createTaskFromImport = async (taskData: ImportTaskData, accessToken?: string): Promise<number> => {
  try {
    const url = taskData.parent_id 
      ? `/api/records/${taskData.parent_id}/subtasks`
      : '/api/records';

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(buildUrl(url, {}), {
      method: 'POST',
      headers,
      body: JSON.stringify(taskData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    const createdId = data?.record?.id || data?.subtask?.id;
    return createdId;
  } catch (error) {
    console.error('创建任务失败:', error);
    throw error;
  }
};

// 支持指定新父任务ID的创建（用于基于原始ID映射后的导入）
const createTaskFromImportWithParent = async (taskData: ImportTaskData, parentNewId?: number, accessToken?: string): Promise<number> => {
  const payload: ImportTaskData = { ...taskData };
  // 在指定父任务时，不再直接使用原始 parent_id
  if (parentNewId) {
    payload.parent_id = undefined; // 避免误用旧ID
  }
  
  try {
    const url = parentNewId 
      ? `/api/records/${parentNewId}/subtasks`
      : '/api/records';

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const response = await fetch(buildUrl(url, {}), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const createdId = data?.record?.id || data?.subtask?.id;
    return createdId;
  } catch (error) {
    console.error('创建任务失败:', error);
    throw error;
  }
};

// 导入Excel数据验证和转换
export const validateImportData = (data: any[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data || data.length === 0) {
    errors.push('导入文件为空');
    return { valid: false, errors };
  }

  // 检查必需的列
  const requiredColumns = ['任务内容'];
  const firstRow = data[0];
  
  for (const col of requiredColumns) {
    if (!firstRow.hasOwnProperty(col)) {
      errors.push(`缺少必需的列: ${col}`);
    }
  }

  // 验证数据
  data.forEach((row, index) => {
    if (!row['任务内容'] || row['任务内容'].toString().trim() === '') {
      errors.push(`第 ${index + 2} 行: 任务内容不能为空`);
    }
    
    if (row['任务内容'] && row['任务内容'].toString().length > 500) {
      errors.push(`第 ${index + 2} 行: 任务内容不能超过500字符`);
    }
    
    // 验证任务类型
    if (row['任务类型'] && !['工作', '业余', '生活'].includes(row['任务类型'])) {
      errors.push(`第 ${index + 2} 行: 任务类型必须是"工作"、"业余"或"生活"之一`);
    }
    
    // 验证优先级
    if (row['优先级'] && !['紧急', '高', '中', '低'].includes(row['优先级'])) {
      errors.push(`第 ${index + 2} 行: 优先级必须是"紧急"、"高"、"中"或"低"之一`);
    }
    
    // 验证状态
    if (row['状态'] && !['待办', '进行中', '已完成', '暂停', '已取消'].includes(row['状态'])) {
      errors.push(`第 ${index + 2} 行: 状态必须是"待办"、"进行中"、"已完成"、"暂停"或"已取消"之一`);
    }

    // 验证父任务ID格式
    if (row['父任务ID'] && row['父任务ID'].toString().trim() !== '') {
      const parentId = parseInt(row['父任务ID'].toString());
      if (isNaN(parentId) || parentId <= 0) {
        errors.push(`第 ${index + 2} 行: 父任务ID必须是有效的正整数`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
};
