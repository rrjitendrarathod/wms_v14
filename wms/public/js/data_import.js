// Copyright (c) 2019, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on('Data Import', {
	
	onload:function(frm){
        set_default_hide_field(frm)
		
	},

	refresh:function(frm){
		three_dot_menu(frm)
	},
		
	import_file(frm) {
		frm.toggle_display('section_import_preview', frm.has_import_file());
		if (!frm.has_import_file()) {
			frm.get_field('import_preview').$wrapper.empty();
			$('[data-label="Start%20Import"]').hide();
			return;
		} else {
			frm.trigger('update_primary_action');
		}

		// load import preview
		frm.get_field('import_preview').$wrapper.empty();
		$('<span class="text-muted">')
			.html(__('Loading import file...'))
			.appendTo(frm.get_field('import_preview').$wrapper);
		if (frm.doc.reference_doctype === "Bulk Upload Activities") {
			validate_imported_file(frm) //This function is to validate the payor_type column in the file(csv/xlsx) that needs to be imported 
			if(frm.doc.status != "Success"){
				validate_duplicate_records(frm)
			}
			
		}
		// if (frm.doc.reference_doctype === "Employee") {
		// 	validate_hierarchy_table(frm)
		// }
		frm.call({
				method: 'get_preview_from_template',
				args: {
					data_import: frm.doc.name,
					import_file: frm.doc.import_file,
					google_sheets_url: frm.doc.google_sheets_url
				},
				error_handlers: {
					TimestampMismatchError() {
						// ignore this error
					}
				}
			})
			.then(r => {
				let preview_data = r.message; 
                frm.events.show_import_preview(frm, preview_data);
				frm.events.show_import_warnings(frm, preview_data); 
				if (frm.doc.reference_doctype === "Bulk Upload Activities") {
					var mrNumberIndex = preview_data.columns.findIndex(p => p.header_title == "MR Number");
					var payorTypeIndex = preview_data.columns.findIndex(p => p.header_title == "Payor Type (as per HCHB)");
					var assessmentTypeIndex = preview_data.columns.findIndex(p => p.header_title == "Assessment Type");
					var arrivedDateIndex = preview_data.columns.findIndex(p => p.header_title == "Arrived Date");
				
					var fieldList = preview_data.data;
					var mrNumbers = [];
				
					fieldList.forEach(function(field) {
						var mrNumber = field[mrNumberIndex];
						var payorType = field[payorTypeIndex];
						var assessmentType = field[assessmentTypeIndex];
						var arrivedDate = field[arrivedDateIndex];
				
						mrNumbers.push({
							mrNumber: mrNumber,
							payorType: payorType,
							assessmentType: assessmentType,
							arrivedDate: arrivedDate
						});
					});
				
					var sameAttributesMRNumbers = [];
				
					mrNumbers.forEach(function(mr) {
						var sameAttributes = mrNumbers.filter(function(item) {
							return (
								item.mrNumber === mr.mrNumber &&
								item.payorType === mr.payorType &&
								item.assessmentType === mr.assessmentType &&
								item.arrivedDate === mr.arrivedDate
							);
						});
						if (sameAttributes.length > 1 && !sameAttributesMRNumbers.includes(mr.mrNumber)) {
							sameAttributesMRNumbers.push(mr.mrNumber);
						}
					});
				
					if (sameAttributesMRNumbers.length > 0) {
						var msg = "MR Numbers with same values: " + sameAttributesMRNumbers.join(", ");
						frappe.msgprint(msg);
						frm.disable_save()
						$('[data-label="Start%20Import"]').hide();
					}else{
						$('[data-label="Start%20Import"]').show();
					}
				}				
				
				let warnings = JSON.parse(frm.doc.template_warnings || "[]");
				warnings = warnings.concat(preview_data.warnings || []);
				if (warnings.length > 0) { 
					$('[data-label="Start%20Import"]').hide();
				}		
				else {
					$('[data-label="Start%20Import"]').show();
				}  
			});
		},
				
	}
);

function set_default_hide_field(frm){

	if(["Production Inventory Allocation","WMS Manager"].includes(frappe.boot.wms.role_profile ))
	{
		
		frm.set_value('reference_doctype', "Bulk Upload Activities")
		frm.toggle_enable(['reference_doctype'], 0);
		frm.set_value('import_type', "Insert New Records")
		frm.toggle_display(['google_sheets_url','html_5'], 0);
	}
}



function three_dot_menu(frm)
{  
	if (frappe.user_roles.includes("WMS Super User") || frappe.user_roles.includes("Super Admin") || frappe.user_roles.includes("Production Inventory Allocation") || frappe.user_roles.includes("Department Head")){
		remove_assign_to(frm,"Email");
		// remove_assign_to(frm,"Print");
		// remove_assign_to(frm,"Copy to Clipboard");
		// remove_assign_to(frm,"Links");		
	}
	
}



function remove_assign_to(frm){

var three_dot_menu = frm.page.menu

three_dot_menu.children().each(function() {
	var rename_button = $(this);
	var buttonText = rename_button.text().trim();   
	

	var button = rename_button.text().replace(/^\s+|\s+$/gm,'').split('\n')[0];

	if (button === "Email" || buttonText === "Print" || buttonText === "Copy to Clipboard" || buttonText === "Links") {
		rename_button.remove();
	}


})

}

/* Function to validate the imported file for the payor_type column */
function validate_imported_file(frm) {
frappe.call({
	method: 'wms.overrides.data_import.update_import_file',
	args: {
		import_file: frm.doc.import_file,
		data_import: frm.doc.name
	},
	callback: (r) => {
		// on success
	},
	
	})
}

// function validate_hierarchy_table(frm) {
// 	frappe.call({
// 			method: 'rhrms.overrides.employee.validate_bulk_upload_hierarchy_table',
// 			args: {
// 				import_file: frm.doc.import_file,
// 					data_import: frm.doc.name
// 	             },
// 			freeze: true,
// 			callback: (r) => {
// 					// on success
// 					if (r) {
// 						$('[data-label="Start%20Import"]').show();
// 					}
// 			},
// 			error: (r) => {
// 				// on error
// 				if (r) {
// 					$('[data-label="Start%20Import"]').hide();
// 				}
				
// 			}
// 	     })
// 	}

function validate_duplicate_records(frm) {
    frappe.call({
        method: 'wms.overrides.data_import.check_duplicate_records',
        args: {
            import_file: frm.doc.import_file,
            data_import: frm.doc.name
        },
        callback: (r) => {
            if (r && r.message && r.message.length > 0) {
                const messages = r.message.map((record, index) => {
                    const [mr_number, payor_type, assessment_type,arrived_date] = record;
                    return `<b>${index + 2}</b>. MR Number <b>${mr_number}</b>,Arrived Date <b>${arrived_date}</b>,Payor Type <b>${payor_type}</b>, Assessment Type <b>${assessment_type}</b>`;
                });
				frappe.throw({
					title: __('Warning'),
					indicator: 'red',
					message: __("Record(s) already present:<br>" + messages.join("<br>") + "")
				  });
                frm.disable_save();
                $('[data-label="Start%20Import"]').hide();
            }
        },
    });
}