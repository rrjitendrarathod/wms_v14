// Copyright (c) 2022, Manju and contributors
// For license information, please see license.txt



frappe.ui.form.on('QA Work Allocation', {
	medical_coder_flow:function(frm){
		frappe.call({
			method:"frappe.client.get",
			args:{
				doctype:"Medical Coder Flow",
				name:frm.doc.medical_coder_flow,
			},
			callback:(r)=>{
				
				if(r.message){
					frm.set_value('mr_number',r.message.mr_number)
        			frm.set_value('arrived_date',r.message.arrived_date)
        			frm.set_value('patient_name',r.message.patient_name)
        			frm.set_value('payor_type',r.message.payor_type)
					frm.set_value('coder_name',r.message.coder_name)
					frm.set_value('assessment_type',r.message.assigment)
					frm.set_value('branch',r.message.mr_number.slice(0,3));		
					// frm.set_value("starttime",frappe.datetime.now_time())
					
					
				}
			}
		})
		
		
	}
	
	
});





frappe.ui.form.on("QA Work Allocation", {
	refresh: function(frm) {
		frm.set_query("production_documents", function() {
			return {
				filters: {
					'chart_status': "Production Completed"
				}
			};
		});
	}
});



frappe.ui.form.on('QA Work Allocation', {
	refresh(frm) {
				frm.set_query("qa_name", function() {
			return {
				filters: {
					'role_profile_name': "QA"
				}
			};
		});
	}
});


// frappe.ui.form.on('QA Work Allocation',{
// 	validate:function(frm) {
// 	frappe.call({
// 		method:"frappe.client.get_value",
// 		args: {
// 			doctype:"QA Work Allocation",
// 			filters: {
// 				name: frm.doc.assigned_by
// 			},
// 			fieldname:["assigned_by"]
// 		 }, 
  
// 		callback: function(r) { 
// 			console.log(r)
// 			frm.set_value('assigned_by',frappe.session.user)
// 		  }
// 	   })
// 	  }
// });