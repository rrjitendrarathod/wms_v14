// Copyright (c) 2022, Manju and contributors
// For license information, please see license.txt

// frappe.ui.form.on('MItem Test', {
// 	// refresh: function(frm) {

// 	// }
// });




// // Single PickList

frappe.ui.form.on('MItem Test', {
    mitems: function (frm) {
        if (frm.doc.mitems) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    'doctype': 'MItem Values',
                    'name': frm.doc.mitems,
                },
                callback: function (r) {


                    console.log(r);
                    var sub_type_list = [];
                    var sub_type = r.message['sub_values'];

                    for (var x = 0; x < sub_type.length; x++) {
                        sub_type_list.push(sub_type[x]['sub_values']);
                    }

                    console.log(sub_type_list)
                    
                    frappe.meta.get_docfield(frm.doc.doctype,'clinical_response', frm.doc.name).options = sub_type_list; 
                    frm.refresh_field('clinical_response');                   
                    frappe.model.set_value(frm.doc.mitem_test, frm.doc.name, 'clinical_response', sub_type_list[0]);   
                    
                    


                    
                    
                }
                
            });

           
        }
    },
    
    


    onload: function (frm) {
        if (frm.doc.mitems) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    'doctype': 'MItem Values',
                    'name': frm.doc.mitems,
                },
                callback: function (r) {


                    console.log(r);
                    var sub_type_list = [];
                    var sub_type = r.message['sub_values'];

                    for (var x = 0; x < sub_type.length; x++) {
                        sub_type_list.push(sub_type[x]['sub_values']);
                    }

                   
                    
                    frappe.meta.get_docfield(frm.doc.doctype,'clinical_response', frm.doc.name).options = sub_type_list; 
                    frm.refresh_field('clinical_response');                   
                    frappe.model.set_value(frm.doc.mitem_test, frm.doc.name, 'clinical_response', sub_type_list[0]);     
                    
                    
                }
                
            });

           
        }
    } 
});