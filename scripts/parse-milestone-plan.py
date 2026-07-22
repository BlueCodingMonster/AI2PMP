import pandas as pd
import json
import os
import sys

# Configure stdout encoding to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

excel_path = r"d:\workspace-ai\AI2PmP\doc\技术中心2026年第三季度里程碑计划.xlsx"
output_json_path = r"d:\workspace-ai\AI2PmP\scripts\milestone-plan.json"

target_sheets = {
    "数字化建设组": "数字化建设组",
    "能源管理建设组": "能源管理建设组",
    "制造业产品组": "制造业产品组",
    "平台建设组": "平台建设组",
    "AI与数据资产组": "AI与数据资产组",
    "智能设备建设组": "智能设备组"
}

def clean_val(val):
    if pd.isna(val):
        return None
    s = str(val).strip()
    if s == "" or s.lower() == "nan" or s == "nat":
        return None
    return s

def clean_int_rate(val):
    if pd.isna(val):
        return 0
    s = str(val).strip().replace("%", "")
    try:
        return int(float(s))
    except Exception:
        return 0

def parse_sheet(xls, sheet_name, team_name):
    print(f"Parsing sheet: {sheet_name} -> Team: {team_name}")
    df = pd.read_excel(xls, sheet_name=sheet_name, header=None)
    
    goals = []
    risks = []
    
    # 1. Find Table Headers
    goal_header_idx = -1
    risk_header_idx = -1
    
    for idx, row in df.iterrows():
        row_vals = [clean_val(x) for x in row]
        # Check for Goal Table Header
        if "目标域" in row_vals and ("季度目标" in row_vals or "季度目标描述" in row_vals):
            goal_header_idx = idx
        # Check for Risk Table Header
        if "风险编号" in row_vals and "风险描述" in row_vals:
            risk_header_idx = idx
            
    if goal_header_idx == -1:
        raise ValueError(f"Could not find goals header in sheet {sheet_name}")
        
    # Get column names and find the index of "序"
    goal_cols = [clean_val(x) for x in df.iloc[goal_header_idx]]
    seq_col_idx = -1
    for idx, col in enumerate(goal_cols):
        if col == "序":
            seq_col_idx = idx
            break
    if seq_col_idx == -1:
        seq_col_idx = 1 # default fallback
        
    # Helper to get column value safely by matching name keywords
    def get_col_val(row_vals, keywords, default_idx):
        for idx, col_name in enumerate(goal_cols):
            if col_name and any(kw in col_name for kw in keywords):
                if idx < len(row_vals):
                    return row_vals[idx]
        if default_idx < len(row_vals):
            return row_vals[default_idx]
        return None
        
    # 2. Parse Goals (between goal_header_idx and risk_header_idx or end of sheet)
    limit = risk_header_idx if risk_header_idx != -1 else len(df)
    for idx in range(goal_header_idx + 1, limit):
        row = df.iloc[idx]
        row_vals = [clean_val(x) for x in row]
        if not row_vals or len(row_vals) <= seq_col_idx:
            continue
            
        seq = row_vals[seq_col_idx]
        # Check if seq is a number
        is_seq = False
        if seq:
            try:
                int(float(str(seq)))
                is_seq = True
            except ValueError:
                pass
                
        if not is_seq:
            continue
            
        # Map fields
        domain = get_col_val(row_vals, ["目标域"], seq_col_idx + 1)
        q_goal = get_col_val(row_vals, ["季度目标", "季度目标描述"], seq_col_idx + 2)
        if not q_goal:
            continue
        criteria = get_col_val(row_vals, ["成功标准"], seq_col_idx + 3)
        
        m1_goal = get_col_val(row_vals, ["M1目标", "M1目标值"], seq_col_idx + 4)
        m1_status = get_col_val(row_vals, ["M1状态"], seq_col_idx + 5)
        
        m2_goal = get_col_val(row_vals, ["M2目标", "M2目标值"], seq_col_idx + 6)
        m2_status = get_col_val(row_vals, ["M2状态"], seq_col_idx + 7)
        
        m3_goal = get_col_val(row_vals, ["M3目标", "M3目标值"], seq_col_idx + 8)
        m3_status = get_col_val(row_vals, ["M3状态"], seq_col_idx + 9)
        
        curr_comp = get_col_val(row_vals, ["当前完成", "当前完成值"], seq_col_idx + 10)
        
        # Rate index
        rate_val = None
        for r_idx, col_name in enumerate(goal_cols):
            if col_name and ("达成率" in col_name or "达成率%" in col_name):
                rate_val = row_vals[r_idx]
                break
        rate = clean_int_rate(rate_val) if rate_val is not None else 0
        
        q_status = get_col_val(row_vals, ["季度状态"], seq_col_idx + 12)
        dependencies = get_col_val(row_vals, ["关键依赖", "核心依赖"], seq_col_idx + 13)
        notes = get_col_val(row_vals, ["备注"], seq_col_idx + 14)
        
        goals.append({
            "domain": domain,
            "quarterlyGoal": q_goal,
            "successCriteria": criteria,
            "month1Goal": m1_goal,
            "month1Status": m1_status,
            "month2Goal": m2_goal,
            "month2Status": m2_status,
            "month3Goal": m3_goal,
            "month3Status": m3_status,
            "currentCompletion": curr_comp,
            "achievementRate": rate,
            "quarterlyStatus": q_status,
            "keyDependencies": dependencies,
            "notes": notes
        })
        
    # 3. Parse Risks
    if risk_header_idx != -1:
        risk_cols = [clean_val(x) for x in df.iloc[risk_header_idx]]
        risk_seq_col_idx = -1
        for idx, col in enumerate(risk_cols):
            if col == "风险编号":
                risk_seq_col_idx = idx
                break
        if risk_seq_col_idx == -1:
            risk_seq_col_idx = 1
            
        def get_risk_col_val(row_vals, keywords, default_idx):
            for idx, col_name in enumerate(risk_cols):
                if col_name and any(kw in col_name for kw in keywords):
                    if idx < len(row_vals):
                        return row_vals[idx]
            if default_idx < len(row_vals):
                return row_vals[default_idx]
            return None
            
        for idx in range(risk_header_idx + 1, len(df)):
            row = df.iloc[idx]
            row_vals = [clean_val(x) for x in row]
            if not row_vals or len(row_vals) <= risk_seq_col_idx:
                continue
                
            risk_id = row_vals[risk_seq_col_idx]
            if not risk_id or not str(risk_id).startswith("R"):
                continue
                
            desc = get_risk_col_val(row_vals, ["风险描述"], risk_seq_col_idx + 1)
            milestone = get_risk_col_val(row_vals, ["影响里程碑"], risk_seq_col_idx + 2)
            prob = get_risk_col_val(row_vals, ["概率", "发生概率"], risk_seq_col_idx + 3)
            impact = get_risk_col_val(row_vals, ["影响", "影响程度"], risk_seq_col_idx + 4)
            lvl = get_risk_col_val(row_vals, ["综合级", "综合风险级"], risk_seq_col_idx + 5)
            trigger = get_risk_col_val(row_vals, ["触发条件"], risk_seq_col_idx + 6)
            strategy = get_risk_col_val(row_vals, ["应对策略"], risk_seq_col_idx + 7)
            warn = get_risk_col_val(row_vals, ["预警节点", "预警时间"], risk_seq_col_idx + 8)
            status = get_risk_col_val(row_vals, ["当前状态", "风险状态"], risk_seq_col_idx + 9)
            
            if not desc:
                continue
                
            risks.append({
                "riskDescription": desc,
                "affectedMilestone": milestone,
                "probability": prob,
                "impact": impact,
                "overallLevel": lvl,
                "triggerCondition": trigger,
                "responseStrategy": strategy,
                "warningPoint": warn,
                "status": status
            })
            
    return {
        "teamName": team_name,
        "year": 2026,
        "quarter": 3,
        "goals": goals,
        "risks": risks
    }

def main():
    xls = pd.ExcelFile(excel_path)
    parsed_plans = []
    
    for sheet_name, team_name in target_sheets.items():
        if sheet_name not in xls.sheet_names:
            print(f"Warning: Sheet {sheet_name} not found in Excel file, skipping.")
            continue
        plan = parse_sheet(xls, sheet_name, team_name)
        parsed_plans.append(plan)
        
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(parsed_plans, f, ensure_ascii=False, indent=2)
        
    print(f"\nSuccessfully parsed {len(parsed_plans)} sheets and wrote JSON to {output_json_path}")

if __name__ == "__main__":
    main()
