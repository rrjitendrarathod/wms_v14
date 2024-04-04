// Copyright (c) 2023, Manju and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["QA Weightage"] = {
    "filters": [
        {
            "fieldname":"name",
            "label": ("Work Allocation"),
            "fieldtype": "Link",
            "options": "Medical Coder Flow",
            "get_query": function() {
                return {
                    query: 'wms.wms.report.qa_weightage.qa_weightage.get_work_allocations',
                }
            }
        },
        {
            "fieldname":"qa_name",
            "label": ("QA Weightage"),
            "fieldtype": "Link",
            "options": "QA Weightage",
            "get_query": function() {
                return {
                    query: 'wms.wms.report.qa_weightage.qa_weightage.get_qa_weightage',
                }
            }
        }
    ],
    
    "onload": function (report) {
        var filters = frappe.utils.get_query_params();
        ['name', 'qa_name'].forEach(function (fieldname) {
            if (filters[fieldname]) {
                report.filter_area.find('[name="' + fieldname + '"]').val(filters[fieldname]);
            }
        });
        
        report.refresh();

        three_dot_menu_remove(report)   
        frappe.boot.sysdefaults.date_format = "mm-dd-yyyy";  
        
    },

    "formatter": function (value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);
        if (column.fieldname == "docstatus" && data && data.docstatus === 'Cancelled') {
                value = "<span style='color:red'>" + value.bold() + "</span>";
        }
        else if(column.fieldname == "docstatus" && data && data.docstatus === 'Submitted'){
                value = "<span style='color:green'>" + value.bold() + "</span>";
        }

        if (column.fieldname == "pass_" && data && data.pass_ === 'No') {
            value = "<span style='color:red'>" + value.bold() + "</span>";
        }
        else if(column.fieldname == "pass_" && data && data.pass_ === 'Yes'){
            value = "<span style='color:green'>" + value.bold() + "</span>";
        }

        if (column.fieldname == "error_type_classification" && data && data.error_type_classification === 'Very Critical') {
            value = "<span style='color:red'>" + value.bold() + "</span>";
        }
        else if(column.fieldname == "error_type_classification" && data && data.error_type_classification === 'No Error'){
            value = "<span style='color:green'>" + value.bold() + "</span>";
        }
        else if(column.fieldname == "error_type_classification" && data && data.error_type_classification === 'Critical'){
            value = "<span style='color:orange'>" + value.bold() + "</span>";
        }
        else if(column.fieldname == "error_type_classification" && data && data.error_type_classification === 'Non Critical'){
            value = "<span style='color:ruby'>" + value.bold() + "</span>";
        }

        if (column.fieldname == "oasis" && data && data.oasis === 'No') {
            value = "<span style='color:green'>" + value.bold() + "</span>";
        }
        else if(column.fieldname == "oasis" && data && data.oasis === 'Yes'){
            value = "<span style='color:red'>" + value.bold() + "</span>";
        }

        if (column.fieldname == "total_score" && data && data.total_score >=95) {
            value = "<span style='color:green'>" + value.bold() + "</span>";
        }
        else if(column.fieldname == "total_score" && data && data.total_score >=90 && data.total_score <95){
            value = "<span style='color:orange'>" + value.bold() + "</span>";
        }
        else if(column.fieldname == "total_score" && data && data.total_score < 90){
            value = "<span style='color:red'>" + value.bold() + "</span>";
        }
        return value;
    },
   
};

function three_dot_menu_remove(report){
    var three_dot_menu = report.page.menu;
    three_dot_menu.children().each(function() {
        var option_button = $(this);
        var buttonText = option_button.text().trim();

        if (buttonText !== "Export") {
            option_button.remove();
        }
    });
}