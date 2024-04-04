import frappe
from frappe.utils import get_datetime
from datetime import datetime      
from pypika import Table, Order
from frappe.query_builder.functions import Count,Cast_,CurDate
from wms.public.py.user_data import add
from frappe.utils import get_traceback
from itertools import repeat
from frappe import cache
from wms.utils.common import Caller,validate_total_records

def update_age_of_chart(doc, method):
      if doc.arrived_date:
        arrived_datetime = get_datetime(doc.arrived_date)
        current_datetime = datetime.now()
        age_delta = abs(current_datetime - arrived_datetime)
        age_days = age_delta.days
        age_hours = age_delta.seconds // 3600
        #age_minutes = (age_delta.seconds % 3600) // 60
        age_str = "{} days, {} hours".format(age_days, age_hours)
        doc.age_of_chart = age_str
        doc.save()
        doc.reload()

m_c = Table('tabMedical Coder Flow')
bua = Table('tabBulk Upload Activities')
emp = Table('tabEmployee')
r_h =Table('tabReport Heirarchy')


@frappe.whitelist()
def validate_queue():
    """allow limited no of records to medical-coder"""
    try:
        validate_total_records(Caller.CODER_NAME.value,'CODER',frappe.session.user)
        validate_working_records()
        validate_hold_records()
        validate_draft_records()
        assign_record_to_medical_coder()

    except Exception as e:
        print(get_traceback(e))

def validate_working_records():
    query = frappe.db.sql(""" select count(name) as total from `tabMedical Coder Flow` where coder_name = "{0}" 
    and chart_status="In-Progress" and hold_reason is null order by arrived_date asc """.format(frappe.session.user),as_dict=1)
    if query and query[0]['total']:
        frappe.throw('You can work only on 1 record at a time')

def validate_hold_records():
    query = ( frappe.qb.from_(m_c)
        .select(Count(m_c.name).as_('total_hold')).
        where((m_c.codername == frappe.session.user)
            & (m_c.chart_status=="In-Progress")
              & (m_c.hold_reason.isnotnull())
            )
    )
    result = frappe.db.sql(str(query),as_dict=1)
    if result and result[0]['total_hold']==3:
        frappe.throw('You have 3 records are on hold')


def assign_record_to_medical_coder():
    """assign record to medical-coder"""
    try:
        p_type,a_type = compare_payor_assessment_type()
        query = (
            frappe.qb.from_(bua)
            .select(bua.name,bua.assigned_manager)
            .where((bua.status == "Active") & (bua.mitem_payortype == p_type ) & (bua.assessment_type == a_type) & (bua.activity_status == "Open")
            )
        )
        query = query.orderby(bua.priority)
        query = query.orderby(bua.arrived_date, Order=Order.asc)
        query = frappe.db.sql(str(query), as_dict=1)
        if query:
            for q in query:
                if q.assigned_manager and q.assigned_manager==get_production_tl():
                    return make_assignment(q.name)
                elif (q.assigned_manager is None) or (q.assigned_manager==""):
                    return make_assignment(q.name)
            frappe.msgprint("Records exhausted, please contact your supervisor")
    except Exception as e:
        print(get_traceback(e))


def update_doc(name: str) -> None:
    """sync assinged_to and production_tl"""
    frappe.db.sql(str(frappe.qb.update(bua).set(bua.assigned_to, frappe.session.user).set(
        bua.assigned_manager, get_production_tl()).set(bua.activity_status,'Picked').where(bua.name == name)))

def get_functionality():
    p_type,a_type = map(lambda x:list(x),repeat([],2))
    parent = frappe.db.get_value('Employee',{'user_id':frappe.session.user},'name')
    result = frappe.db.get_all("Functionalities",filters={'parent':parent},fields=['functionality'])
    if not result:
        frappe.throw("Please set functionalities in the employee form")
    for r in result:
        r = r.functionality.split('-')
        if len(r)==2:
            p_type.append(r[0].strip()),a_type.append(r[1].strip())
    return list(set(p_type)),list(set(a_type))


@frappe.whitelist()
def validate_qa_queue():
    validate_total_records(Caller.QA_NAME.value,'QA',frappe.session.user)
    validate_qa_working_records()
    validate_hold_qa_records()
    assign_record_to_qa()

def update_cache(name:str,user:str=None)->None:
    try:
        val = cache().hget(name,user or frappe.session.user)
        if val:
            cache().hset(name,user or frappe.session.user,int(val)+1)
            return
        cache().hset(name,user or frappe.session.user,1)
    except Exception as e:
        print(e)



def assign_record_to_qa():
    """assign record to medical-coder"""
    try:
        query = frappe.db.sql(""" 
            select mc.assigned_by,
            mc.name,mc.codername,
            emp.custom_sampling_percentage,
            emp.custom_tenure_value,
            mc.assessment_type,
            mc.hold_reason,
            mc.technical_issue
            from `tabMedical Coder Flow` as mc
            inner join `tabEmployee` as emp
            on mc.codername=emp.user_id
            where 
            mc.chart_status="Production Completed" 
            and mc.assessment_type not in ('ROC','Recert')
            and (mc.email is null or mc.email ="")
            and (mc.hold_reason is null or mc.hold_reason="")
            and (mc.technical_issue is null or mc.technical_issue="")
            order by mc.priority,mc.modified desc
        """,as_dict=1)
        query = validate_percentage(query)
        if query:
            update_qa_tl(query.name)
            # self assignment
            add(args=dict(doctype='Medical Coder Flow',
            name=query.name, assign_to=[frappe.session.user]),flag=1)
            #update-cache
            update_cache(Caller.QA_NAME.value)
            update_cache(Caller.CODER_COUNT.value,query.codername)
            update_workflow(query.name)
            frappe.publish_realtime(event='sync_qa',user=frappe.session.user)
            frappe.msgprint(msg="Record Assigned Successfully",alert=True)
    except Exception as e:
        print(get_traceback(e))

def update_qa_tl(name):
    user = get_qa_tl()
    frappe.db.sql(
        str(frappe.qb.update(m_c)
        .set(m_c.email, frappe.session.user)
        .set(m_c.assign_to_name,frappe.db.get_value('Employee',{'user_id':user},'employee_name'))
        .set(m_c.assigned_by,user)
        .where(m_c.name == name))
        )

def validate_percentage(query):
    if query:
        for q in query: 
            count =cache().hget('coder_count',q.codername) or 0
            if (q.assigned_by and q.assigned_by==get_qa_tl()) and (q.custom_sampling_percentage and count<int(q.custom_sampling_percentage)):
                return q
            elif (q.assigned_by is None) or (q.assigned_by=="")  and (q.custom_sampling_percentage and count<int(q.custom_sampling_percentage)):
                return q
        frappe.throw('Either Sampling limit reached for available coders OR Non ROC and Recert charts are unavailable to be Picked for Audit')
    #No Record
    frappe.throw('No charts available to pick')
    return None

def update_workflow(name):
    """update workflow and chart-status"""
    frappe.db.sql(
        str(frappe.qb.update(m_c)
        .set(m_c.chart_status,"Pending Quality")
        .set(m_c.workflow_state,"Pending Quality")
        .where(m_c.name == name))
        )
    
    if name:
        from frappe.utils import format_date, format_time
        bu_doc = frappe.get_doc('Medical Coder Flow', name, ignore_permissions=True)
        wa_doc = frappe.get_doc("Work Allocation Activity History", name, ignore_permissions=True)

        wa_doc.append("wa_history", {
                        "activity": "Picked for Audit",
                        "milestones": format_date(bu_doc.modified,format_string = "mm-dd-yyyy" + " " + format_time(bu_doc.modified,format_string = "HH:mm:ss")),
                        "user": bu_doc.email 
                    })

        wa_doc.append("wa_history", {
                        "activity": "Pending Quality",
                        "milestones": format_date(bu_doc.modified,format_string = "mm-dd-yyyy" + " " + format_time(bu_doc.modified,format_string = "HH:mm:ss")),
                        "user": "Self assigned by " + bu_doc.email
                    })
        wa_doc.save(ignore_permissions=True)

def validate_draft_records():
    query = ( frappe.qb.from_(bua)
        .select((bua.name))
        .where(
            (bua.assigned_to == frappe.session.user)
            &(bua.activity_status=="Picked")
        )
    )
    result = frappe.db.sql(str(query),as_dict=1)
    if result:
        frappe.throw('You can work only on one activity.')

def compare_payor_assessment_type():
    query = (
        frappe.qb.from_(bua)
        .select(bua.name,bua.mitem_payortype,bua.assessment_type,bua.activity_status)
        .where((bua.status =="Active") & (bua.activity_status == 'Open'))
    )
    query = query.orderby(bua.priority)
    query = query.orderby(bua.arrived_date, Order=Order.asc)

    p_type,a_type = get_functionality()
    query = frappe.db.sql(str(query), as_dict=1)
    i,j = None,None
    if query:
        for q in query:
            if q.mitem_payortype in p_type and i is None and q.assessment_type in a_type and j is None:
                i,j = p_type.index(q.mitem_payortype),a_type.index(q.assessment_type)
                i,j = p_type.pop(i), a_type.pop(j)
                return i,j
    frappe.throw("No records available. Please contact your Supervisor")

def get_production_tl():
    emp = frappe.get_doc('Employee',dict(user_id =frappe.session.user))
    query = frappe.qb.from_(r_h).select(
        r_h.employee).where((r_h.role == 'Production TL')&(r_h.parent == emp.name)&(r_h.parenttype=="Employee")&(r_h.parentfield=="wms_hierarchy"))
    query = frappe.db.sql(str(query),as_dict=1)
    return query[0]['employee'] if query else None

def make_assignment(name:str):
    update_doc(name)
    # self assignment
    add(args=dict(doctype='Bulk Upload Activities',
                  name=name, assign_to=[frappe.session.user]),flag=1)
    #update-cache
    update_cache(Caller.CODER_NAME.value)
    frappe.publish_realtime(event='sync_list',user=frappe.session.user)
    frappe.msgprint(msg="Record Assigned Successfully",alert=True)

    if name:
        from frappe.utils import format_date, format_time
        bu_doc = frappe.get_doc('Bulk Upload Activities', name, ignore_permissions=True)
        wa_doc = frappe.get_doc("Work Allocation Activity History", name, ignore_permissions=True)
        wa_doc.append("wa_history", {
                        "activity": "Add or Manage Activity assign",
                        "milestones": format_date(bu_doc.modified,format_string = "mm-dd-yyyy" + " " + format_time(bu_doc.modified,format_string = "HH:mm:ss")),
                        "user": bu_doc.assigned_to 
                    })
        wa_doc.save(ignore_permissions=True)


def validate_qa_working_records():
    q = frappe.db.sql(""" select count(name) as total from `tabMedical Coder Flow` where email ="{0}" 
    and chart_status="Pending Quality" and (hold_reason is null or hold_reason="") and (technical_issue is null or technical_issue="") """.format(frappe.session.user),as_dict=1)
    if q and q[0]['total']:
        frappe.throw('You can work only on 1 record at a time')

def validate_hold_qa_records():
    query = ( frappe.qb.from_(m_c)
        .select(Count(m_c.name).as_('total_hold')).
        where((m_c.email == frappe.session.user)
            & (m_c.chart_status=="Pending Quality")
              & (m_c.hold_reason.isnotnull()| m_c.technical_issue.isnotnull())
            )
    )
    r = frappe.db.sql(str(query),as_dict=1)
    if r and r[0]['total_hold']==3:
        frappe.throw('You have 3 records are on hold')

def get_qa_tl():
    emp = frappe.get_doc('Employee',dict(user_id =frappe.session.user))
    query = frappe.qb.from_(r_h).select(
        r_h.employee).where((r_h.role == 'QA Lead')&(r_h.parent == emp.name)&(r_h.parenttype=="Employee")&(r_h.parentfield=="wms_hierarchy"))
    query = frappe.db.sql(str(query),as_dict=1)
    return query[0]['employee'] if query else None
