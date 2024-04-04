// frappe.ui.form.on('Notification Log', {
// 	refresh: function(frm) 
// 	{    
// 		if(frappe.user_roles.includes("QA Lead") || frappe.user_roles.includes("QA")){
// 			frappe.call({
// 				method:"wms.public.py.user_data.notification_restrication",
// 				args: {
// 					name:frm.doc.document_name,			
// 				},
// 				callback:(r) => 
// 				{  					
// 					if(frappe.user_roles.includes("QA Lead")){
// 						var email = "assigned_by";
// 					}
// 					if(frappe.user_roles.includes("QA")){
// 						var email = "email"
// 					}
// 					if(r.message[0][email] == frappe.session.user){
// 						const dt = frm.doc.document_type;
// 						const dn = frm.doc.document_name;
// 						frappe.set_route('Form', dt, dn);
// 					}
// 					else{
// 						const dt = frm.doc.document_type;
// 						const dn = frm.doc.document_name;
// 						frappe.set_route('List', dt);
	
// 						frappe.show_alert({
// 							message:__('This '+`${frm.doc.document_name}`+' '+ 'has been reassigned'),
// 							indicator:'orange'
// 						},5) 				
// 					}
	
// 				}			
// 			})
// 		}
// 		else if(frappe.user_roles.includes("Medical Coder") || frappe.user_roles.includes("Production TL")){
// 			frappe.call({
// 				method:"wms.public.py.user_data.notification_restrication_for_mc",
// 				args: {
// 					name:frm.doc.document_name,			
// 				},
// 				callback:(r) => 
// 				{  					
// 					if(frappe.user_roles.includes("Medical Coder")){
// 						var email = "assigned_to";
// 					}
// 					if(frappe.user_roles.includes("Production TL")){
// 						var email = "assigned_manager"
// 					}
// 					if(r.message[0][email] == frappe.session.user){
// 						const dt = frm.doc.document_type;
// 						const dn = frm.doc.document_name;
// 						frappe.set_route('Form', dt, dn);
// 					}
// 					else{
// 						const dt = frm.doc.document_type;
// 						const dn = frm.doc.document_name;
// 						frappe.set_route('List', dt);
	
// 						frappe.show_alert({
// 							message:__('This '+`${r.message[0]['mr_number']}`+' '+ 'has been reassigned'),
// 							indicator:'orange'
// 						},5) 				
// 					}
	
// 				}			
// 			})
// 		}
// 		else{
// 			const dt = frm.doc.document_type;
// 			const dn = frm.doc.document_name;
// 			frappe.set_route('Form', dt, dn);
// 		}

// 	},
// 	onload: function(frm) {
// 		const dt = frm.doc.document_type;
// 		const dn = frm.doc.document_name;
// 		frappe.set_route('Form', dt, dn);
// 	},
	

// 	set_attachment: function(frm) {
// 		const attachment = JSON.parse(frm.doc.attached_file);

// 		const $wrapper = frm.get_field('attachment_link').$wrapper;
// 		$wrapper.html(`
// 			<div class="attached-file text-medium">
// 				<div class="ellipsis">
// 					<i class="fa fa-paperclip"></i>
// 					<a class="attached-file-link">${attachment.name}.pdf</a>
// 				</div>
// 			</div>
// 		`);

// 		$wrapper.find(".attached-file-link").click(() => {
// 			const w = window.open(
// 				frappe.urllib.get_full_url(`/api/method/frappe.utils.print_format.download_pdf?
// 					doctype=${encodeURIComponent(attachment.doctype)}
// 					&name=${encodeURIComponent(attachment.name)}
// 					&format=${encodeURIComponent(attachment.print_format)}
// 					&lang=${encodeURIComponent(attachment.lang)}`)
// 			);
// 			if (!w) {
// 				frappe.msgprint(__("Please enable pop-ups"));
// 			}
// 		});
// 	}
// });
