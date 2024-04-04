// Copyright (c) 2022, Manju and contributors
// For license information, please see license.txt
frappe.ui.form.on('Bulk Upload Activities', {
	setup:(frm)=>{
		frappe.boot.sysdefaults.date_format = "mm-dd-yyyy";
	},
	onload: function (frm) {
		// $('.form-viewers.d-flex').remove()
		if (!["WMS Super User", "Super User", "Production Inventory Allocation"].includes(frappe.boot.wms.role_profile) && frappe.session.user != "Administrator") {
			frm.toggle_enable(['mr_number', 'patient_name', 'arrived_date', 'payor_type', 'assessment_type'], 0)
		}
		frm.trigger("patient_name")
		
	},


	refresh: function (frm) {
		$('.form-viewers.d-flex').remove()
		frm.trigger("make_fields_read_only_and_hide")
		frm.trigger("create_medical_coder_form")
		frm.trigger("filters_assigned_manager")
		frm.trigger("work_allocation_history_button")
		frm.trigger("three_dot_menu")
		frm.trigger("add_css")

		hide_mr_number_qatl(frm)

		make_fields_readonly_basedon_inactive_status(frm)
		//frm.trigger("chart_age")
		restrict_future_date(frm)
	},

	validate: function (frm) {
		frm.trigger("validate_alfa_numeric")
		//frm.trigger("chart_age")
		
	},

	chart_age: function(frm){
		const diff = frappe.datetime.get_hour_diff(frm.doc.today, frm.doc.arrived_date);
		const days = Math.floor(diff/24);
		const hours = Math.floor(diff - (days * 24));
		let age_of_chart = `${days} days, ${hours} hours`
		frm.set_value("age_of_chart", age_of_chart)
		if (!frm.is_new()){
		frm.save()
		}
	},

	arrived_date: function (frm) {
		let date_diff = frappe.datetime.get_diff(frm.doc.arrived_date, frappe.datetime.now_date())
		if (date_diff > 0) {
			frappe.show_alert({ message: __('Cannot select a future date'), indicator: 'red' })
			frm.set_value('arrived_date', null)
		}
	},

	create_medical_coder_form: function (frm) {
		if (!frm.is_new() && frappe.user.has_role('Medical Coder') && frm.doc.status == "Active") {
			frappe.db.exists("Medical Coder Flow", frm.doc.name).then(exists => {
				if (!exists) {
					frm.add_custom_button('Create Medical Coder Form', () => {
						frappe.new_doc('Medical Coder Flow', {
							patient_reference_details: frm.doc.name
						})
					})

				}
			});
		}
	},

	make_fields_read_only_and_hide: function (frm) {
		if (frappe.session.user != "Administrator") {
			cur_frm.page.sidebar.remove();
		}

		frm.toggle_display(['production_tl_reassign_table'], 0);

		frappe.db.exists("Medical Coder Flow", frm.doc.name).then(exists => {
			if (exists) {
				frm.toggle_enable(["mr_number", "patient_name", "arrived_date", "payor_type", "assessment_type", "status", "priority"], 0)
			}
		});

		//disabel_email_button
		if (!["Administrator", "WMS Super User"].includes(frappe.boot.wms.role_profile)) {
			$(`.btn-secondary-dark`).prop('disabled', true)
		}
	},

	validate_alfa_numeric: function (frm) {
		var regex = /[^a-zA-Z0-9]/g;
		if (regex.test(frm.doc.mr_number)) {
			frappe.msgprint(__("<b>MR Number</b>:  Only Alphabets and Numbers are allowed."));
			frappe.validated = false;
		}

		// var patient_name = /[^a-zA-Z.,\s]/g;
		var patient_name = /^[a-zA-Z][a-zA-Z.,\s]*$/;
		if (!patient_name.test(frm.doc.patient_name)) {
			frappe.msgprint(__("<b>Patient Name</b>: Should start with an alphabet and only contain Alphabets, Commas, Space, and Period."));
			frappe.validated = false;
		}
	},

	filters_assigned_manager: function (frm) {
		frm.set_query("assigned_manager", () => {
			return {
				query: 'wms.wms.doctype.bulk_upload_activities.bulk_upload_activities.get_production_tl',
			}
		});
	},

	work_allocation_history_button: function (frm) {
		var roles = ["Production TL", "QA Lead", "Operations Manager", "QA Manager", "Department Head", "WMS Super User", "Super User", "Administrator"]
		if (frm.doc.work_allocation_activity_history && roles.includes(frappe.boot.wms.role_profile)) {
			frm.add_custom_button(__('Work Allocation History'), () => {
				window.open("/app/work-allocation-activity-history/" + frm.doc.work_allocation_activity_history + " ")
			}).removeClass("btn-default").addClass("btn-primary")
		}
	},

	three_dot_menu: function (frm) {
		var fieldList = [2, 3, 4, 6]
		fieldList.forEach(function (field) {
			$(".dropdown-menu-right > li").eq(field).hide();
		})

		var profile_lst = ["WMS Super User", "Super User", "Production Inventory Allocation", "Production TL", "Medical Coder", "Department Head", "Operations Manager"]
		if (profile_lst.includes(frappe.boot.wms.role_profile)) {
			frm.trigger("remove_assign_to")
		}
	},

	remove_assign_to: function (frm) {
		var three_dot_menu = frm.page.menu
		three_dot_menu.children().each(function () {
			var rename_button = $(this);
			var buttonText = rename_button.text().trim();
			var button = rename_button.text().replace(/^\s+|\s+$/gm, '').split('\n')[0];
			if (button === "Jump to field" || button === "Email" || buttonText === "Print" || buttonText === "Copy to Clipboard" || buttonText === "Repeat" || buttonText === "Links") {
				rename_button.remove();
			}
		})
	},

	add_css: function (frm) {
		if (frm.doc.age_of_chart <= "1 days, 0 hours") {
			$(`[data-fieldname=${"age_of_chart"}]`).find(".control-value").css({ "font-weight": "bold", "color": "orange" })
		}
		else {
			$(`[data-fieldname=${"age_of_chart"}]`).find(".like-disabled-input").css({ "font-weight": "bold", "color": "red" })
		}
	},

	patient_name: function (frm, cdt, cdn) {
		// frm.set_value('patient_name', frm.doc.patient_name.trim())
		frm.set_value('patient_name', frm.doc.patient_name.toUpperCase())
	},
});

function make_fields_readonly_basedon_inactive_status(frm) {
	if (frm.doc.status == "Inactive") {
		frm.toggle_enable(["mr_number", "patient_name", "arrived_date", "payor_type", "assessment_type", "assigned_manager", "priority"], 0)
	}
	else {
		frm.toggle_enable(["mr_number", "patient_name", "arrived_date", "payor_type", "assessment_type", "assigned_manager", "priority"], 1)
	}

}

function hide_mr_number_qatl(frm){
	if (["QA Lead"].includes(frappe.boot.wms.role_profile)) {
	frappe.db.get_value('Medical Coder Flow', frm.doc.name, ['chart_status'])
    .then(r => {
        let values = r.message;
		if(values.chart_status == "Picked for Audit" || values.chart_status == "Pending Quality"){
			$(`[data-fieldname="mr_number"]`).hide();
			$('.ellipsis.title-text').hide();			
		}
		else {
			$(`[data-fieldname="mr_number"]`).show();
			$('.ellipsis.title-text').show();	
		}
		if(["In-Progress","Clarification Required- Query 1","Clarification Required- Query 2",
			"Clarification Required- Query 3","Production Completed"].includes(values.chart_status)){
			$(`[data-label="Work%20Allocation%20History"]`).hide();
		}
    })
}
}

function restrict_future_date(frm) {
	cur_frm.fields_dict.arrived_date.datepicker.update({
		maxDate: new Date(frappe.datetime.now_datetime()), 
	  });
}