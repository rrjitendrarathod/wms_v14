import frappe
from enum import Enum
from frappe import cache

class Caller(Enum):
    CODER = 'custom_tenure_value'
    QA = 'custom_qa_tenure'
    CODER_NAME = 'activity_count'
    QA_NAME = 'qa_count'
    SMP_PRCT = 'custom_sampling_percentage'
    CODER_COUNT = 'coder_count'

def validate_total_records(name,key,user):
    val = cache().hget(name,user)
    if val and int(val)==get_configuration(key,user):
        frappe.throw(f"{user}has completed target for the day. Please increase the tenure value to assign more charts")

def get_configuration(caller:str,user:str)->str:
    doc = frappe.get_doc('Employee',dict(user_id=user))
    doc = doc.as_dict()
    if not doc[Caller[caller].value]:
        frappe.throw(f"Please set the {Caller[caller].value.title().replace('Custom',' ').replace('_',' ')} in the Configuration.")
    return int(doc[Caller[caller].value])

def decrement_activity_count(old_users:list,new_user:str,name:str,key:str):
    """decrease count in cache"""
    l = len(old_users)
    count = frappe.cache().hget(name,old_users[0])
    if count:
        frappe.cache().hset(name,old_users[0],abs(int(count)-l))
        update_count_for_new_user(new_user,l,name,key)

def update_count_for_new_user(new_user,l,name,key):
    c = frappe.cache().hget(name,new_user)
    validate_total_records(name,key,new_user)
    frappe.cache().hset(name,new_user,abs(int(c)+l)) if c else frappe.cache().hset(name,new_user,l)


def manual_assignment(name:str,key:str,assign_to:str):
    val = cache().hget(name,assign_to)
    validate_total_records(name,key,assign_to)
    cache().hset(name,assign_to,int(val)+1) if val else cache().hset(name,assign_to,1)

