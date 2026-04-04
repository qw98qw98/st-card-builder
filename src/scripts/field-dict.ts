import type { FieldInfo, ValidationResult } from '../types/draft';

// ============================================================
//  字段注释字典
// ============================================================
export const FIELD_DICT: Record<string, FieldInfo> = {
  "name": { label: "角色名", tip: "角色的显示名称", type: "string", required: true },
  "description": { label: "角色描述(顶层)", tip: "V2兼容字段，与data.description同步", type: "string" },
  "personality": { label: "性格(顶层)", tip: "V3中通常留空", type: "string" },
  "scenario": { label: "场景(顶层)", tip: "V3中通常留空", type: "string" },
  "first_mes": { label: "开场白(顶层)", tip: "角色说的第一句话", type: "string" },
  "mes_example": { label: "对话示例(顶层)", tip: "示范角色说话风格", type: "string" },
  "creatorcomment": { label: "作者注释(顶层)", tip: "V2兼容字段", type: "string" },
  "avatar": { label: "头像标记", tip: "头像文件名或none", type: "string" },
  "talkativeness": { label: "话痨程度", tip: "0.0~1.0 控制主动发言频率", type: "string" },
  "fav": { label: "收藏标记", tip: "是否被标记为收藏", type: "boolean" },
  "tags": { label: "标签(顶层)", tip: "分类标签数组", type: "array" },
  "spec": { label: "卡片规格", tip: "固定为chara_card_v3", type: "string", required: true, enum: ["chara_card_v3"] },
  "spec_version": { label: "规格版本", tip: "固定为3.0", type: "string", required: true, enum: ["3.0"] },
  "data.name": { label: "角色名", tip: "V3主数据层角色名", type: "string", required: true },
  "data.description": { label: "角色描述", tip: "核心描述：外貌、性格、背景", type: "string", required: true },
  "data.personality": { label: "性格", tip: "推荐写在description里", type: "string" },
  "data.scenario": { label: "场景", tip: "推荐用世界书代替", type: "string" },
  "data.first_mes": { label: "开场白", tip: "首次对话角色发送的第一条消息", type: "string", required: true },
  "data.mes_example": { label: "对话示例", tip: "格式：<START>\\n{{char}}: ...", type: "string" },
  "data.creator_notes": { label: "作者注释", tip: "给使用者看的说明", type: "string" },
  "data.system_prompt": { label: "系统提示词", tip: "最高优先级系统指令，慎用", type: "string" },
  "data.post_history_instructions": { label: "历史后指令", tip: "Author's Note位置的指令", type: "string" },
  "data.tags": { label: "标签", tip: "分类标签数组", type: "array" },
  "data.creator": { label: "创作者", tip: "卡片制作者名字", type: "string" },
  "data.character_version": { label: "卡片版本", tip: "迭代版本号", type: "string" },
  "data.alternate_greetings": { label: "备选开场白", tip: "多个可选开场白", type: "array" },
  "data.extensions": { label: "扩展数据", tip: "V3扩展字段容器", type: "object" },
  "data.extensions.world": { label: "关联世界书", tip: "关联的世界书名称", type: "string" },
  "data.extensions.regex_scripts": { label: "正则脚本列表", tip: "嵌入卡片的正则替换脚本", type: "array" },
  "data.extensions.regex_scripts[].id": { label: "脚本ID", tip: "唯一标识符", type: "string" },
  "data.extensions.regex_scripts[].scriptName": { label: "脚本名称", tip: "显示名称", type: "string" },
  "data.extensions.regex_scripts[].findRegex": { label: "匹配正则", tip: "正则表达式字符串", type: "string" },
  "data.extensions.regex_scripts[].replaceString": { label: "替换内容", tip: "替换HTML，$1引用捕获组", type: "string" },
  "data.extensions.regex_scripts[].placement": { label: "作用范围", tip: "1=输出 2=输入", type: "array" },
  "data.extensions.regex_scripts[].disabled": { label: "是否禁用", tip: "true则不生效", type: "boolean" },
  "data.extensions.regex_scripts[].runOnEdit": { label: "编辑时执行", tip: "编辑消息时重新执行", type: "boolean" },
  "data.character_book": { label: "内嵌世界书", tip: "嵌入角色卡的世界书", type: "object" },
  "data.character_book.name": { label: "世界书名称", tip: "世界书显示名称", type: "string" },
  "data.character_book.entries": { label: "词条列表", tip: "所有词条数组", type: "array" },
  "data.character_book.entries[].id": { label: "词条ID", tip: "从0开始的索引", type: "number" },
  "data.character_book.entries[].keys": { label: "触发词", tip: "出现这些词时激活词条", type: "array", required: true },
  "data.character_book.entries[].secondary_keys": { label: "次要触发词", tip: "配合selectiveLogic使用", type: "array" },
  "data.character_book.entries[].comment": { label: "词条标题", tip: "仅管理界面显示", type: "string" },
  "data.character_book.entries[].content": { label: "词条内容", tip: "触发后注入的设定文本", type: "string", required: true },
  "data.character_book.entries[].constant": { label: "是否常驻", tip: "true=始终注入，无需触发词", type: "boolean" },
  "data.character_book.entries[].selective": { label: "是否选择性", tip: "true=需要关键词触发", type: "boolean" },
  "data.character_book.entries[].insertion_order": { label: "插入顺序", tip: "数值越大越先处理", type: "number", range: { min: 0, max: 9999 } },
  "data.character_book.entries[].enabled": { label: "是否启用", tip: "false则完全不生效", type: "boolean" },
  "data.character_book.entries[].position": { label: "插入位置(文本)", tip: "V2兼容字段", type: "string" },
  "data.character_book.entries[].use_regex": { label: "正则匹配", tip: "触发词当作正则表达式", type: "boolean" },
  "data.character_book.entries[].extensions": { label: "词条扩展参数", tip: "V3高级控制参数", type: "object" },
  "data.character_book.entries[].extensions.position": { label: "插入位置", tip: "0=角色前 4=按深度(最常用)", type: "number", enum: ["0","1","2","3","4","5","6"] },
  "data.character_book.entries[].extensions.probability": { label: "触发概率", tip: "0~100", type: "number", range: { min: 0, max: 100 } },
  "data.character_book.entries[].extensions.useProbability": { label: "启用概率", tip: "false则忽略概率值", type: "boolean" },
  "data.character_book.entries[].extensions.depth": { label: "插入深度", tip: "position=4时生效", type: "number", range: { min: 0, max: 999 } },
  "data.character_book.entries[].extensions.selectiveLogic": { label: "选择逻辑", tip: "0=AND 1=NOT 2=OR", type: "number", enum: ["0","1","2","3"] },
  "data.character_book.entries[].extensions.group": { label: "互斥组", tip: "同组只能激活一个", type: "string" },
  "data.character_book.entries[].extensions.group_weight": { label: "组权重", tip: "互斥组内优先级", type: "number" },
  "data.character_book.entries[].extensions.role": { label: "深度角色", tip: "0=系统 1=用户 2=助手", type: "number", enum: ["0","1","2"] },
  "data.character_book.entries[].extensions.vectorized": { label: "向量化", tip: "true=语义向量匹配", type: "boolean" },
  "data.character_book.entries[].extensions.display_index": { label: "显示排序", tip: "管理界面排序", type: "number" },
  "data.character_book.entries[].extensions.exclude_recursion": { label: "排除递归", tip: "内容不触发其他词条", type: "boolean" },
  "data.character_book.entries[].extensions.prevent_recursion": { label: "阻止递归", tip: "不被递归触发", type: "boolean" },
  "data.character_book.entries[].extensions.delay_until_recursion": { label: "延迟到递归", tip: "递归扫描阶段才生效", type: "boolean" },
  "data.character_book.entries[].extensions.group_override": { label: "组覆盖", tip: "可覆盖同组已激活词条", type: "boolean" },
  "data.character_book.entries[].extensions.outlet_name": { label: "输出通道", tip: "指定注入通道", type: "string" },
};

export function getFieldInfo(path: string): FieldInfo | undefined {
  if (FIELD_DICT[path]) return FIELD_DICT[path];
  const n1 = path.replace(/\.(\d+)\./g, '[].');
  if (FIELD_DICT[n1]) return FIELD_DICT[n1];
  const n2 = path.replace(/\.(\d+)$/g, '[]');
  if (FIELD_DICT[n2]) return FIELD_DICT[n2];
  return undefined;
}

export function validateField(path: string, value: unknown): string | null {
  const info = getFieldInfo(path);
  if (!info) return null;
  if (info.required && (value === undefined || value === null || value === '')) return '必填字段不能为空';
  if (value !== null && value !== undefined && info.type !== 'any') {
    const t = Array.isArray(value) ? 'array' : typeof value;
    if (t !== info.type) return '类型错误：期望 ' + info.type + '，实际 ' + t;
  }
  if (info.enum && value !== undefined && value !== null && value !== '' && info.enum.indexOf(value as string) === -1) return '值不在允许范围';
  if (info.range && typeof value === 'number') {
    if (info.range.min !== undefined && value < info.range.min) return '最小值为 ' + info.range.min;
    if (info.range.max !== undefined && value > info.range.max) return '最大值为 ' + info.range.max;
  }
  return null;
}

export function validateFullJSON(
  obj: unknown,
  pp?: string,
  errs?: ValidationResult[]
): ValidationResult[] {
  if (!pp) pp = '';
  if (!errs) errs = [];
  if (obj === null || obj === undefined) return errs;
  if (Array.isArray(obj)) {
    (obj as unknown[]).forEach(function (it: unknown, i: number) {
      const p = pp + '.' + i;
      if (typeof it === 'object' && it !== null) validateFullJSON(it, p, errs);
      else {
        const e = validateField(p, it);
        if (e) errs.push({ path: p, message: e, value: it });
      }
    });
  } else if (typeof obj === 'object') {
    Object.keys(obj as Record<string, unknown>).forEach(function (k) {
      const fp = pp ? pp + '.' + k : k;
      const v = (obj as Record<string, unknown>)[k];
      const e = validateField(fp, v);
      if (e) errs.push({ path: fp, message: e, value: v });
      if (typeof v === 'object' && v !== null) validateFullJSON(v, fp, errs);
    });
  }
  return errs;
}
