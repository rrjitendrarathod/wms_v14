// Copyright (c) 2022, RedRoad and contributors
// For license information, please see license.txt
frappe.ui.form.on('QA Weightage', {
	refresh:function(frm) {
		frm.trigger("export_button")
		frm.trigger("add_css_for_some_fileds")
		frm.trigger("na_fields_read_only")
		if(frm.doc.__islocal){
			frm.trigger("add_oasis_value_and_make_read_only")
		}

		if(!["QA","Administrator","WMS Super User","Super User"].includes(frappe.boot.wms.role_profile)){
			frm.disable_form();
		}
	},

	na_fields_read_only: function(frm){
		frappe.call({
			method: "na_fields_read_only",
			freeze: true,
			doc: frm.doc,
			callback: function(r) {
				$.each(r.message, function(i, v) {
					if(v=="NA"){
						frm.set_df_property(i, "read_only", 1)
					}
				})
				frm.refresh_fields();
			}
		});
	},

	export_button: function(frm){
		if(frm.doc.docstatus == 1){
			frm.add_custom_button(__('Export Data'), function() {
				frappe.route_options = {
					"qa_name": frm.doc.name
				};
				frappe.set_route("query-report", "QA Weightage");
			}).removeClass("btn-default").addClass("btn-primary")
		 }
	},

	add_oasis_value_and_make_read_only: function(frm){
		frappe.call({
			method: "fetch_oasis_values",
			freeze: true,
			doc: frm.doc,
			callback: function(r) {
				$.each(r.message, function(i, v) {
					frm.set_value(i, v);
					if(v=="NA"){
						frm.set_df_property(i, "read_only", 1)
					}
				})
				frm.refresh_fields();
			}
		});
	},

	calculate_coding_score_and_coding_weight__points: function(frm){
		// frappe.call({
		// 	method: "calculate_coding_score_and_coding_weight__points",
		// 	freeze: true,
		// 	doc: frm.doc,
		// 	callback: function(r) {
		// 		frm.refresh_fields();
		// 	}
		// });
	},

	add_css_for_some_fileds:function(frm){
		cur_frm.page.sidebar.remove();		
		var fieldList = ["q1","q2","q3","q4","q6","q7","q8","q9","q10","q11","q12","q13","q14","q15","q16","q17","q18","q19","q20","q21","q22","q23","q24","q25","q26","q27","q28","q29","q30","q31","q32","q33","q34","q35","q36","q37","q38","q39","q40","q41","q42","q43"]
		fieldList.forEach(function(field) {
			if(frm.doc[field] == "No"){
				$(`[data-fieldname=${field}]`).addClass("bold");
				$(`[data-fieldname=${field}]`).find(".control-value").addClass("bold");		
			}		
		})

		var fieldList1 = ["q5","qx"]
		fieldList1.forEach(function(fields){
			if(frm.doc[fields] != "Yes-All correct"){
				$(`[data-fieldname=${fields}]`).addClass("bold");
				$(`[data-fieldname=${fields}]`).find(".control-value").addClass("bold");		
			}
		})
		//Add css for MR Number
		$(`[data-fieldname=${"mr_number_qa"}]`).find(".control-label").css({"font-weight": "bold","color":"black"})
		
		if(frm.doc.total_score >=95){
			$(`[data-fieldname=${"total_score"}]`).find(".control-value").css({"font-weight": "bold","color":"green"})
		}else if(frm.doc.total_score <95 && frm.doc.total_score >=91){
			$(`[data-fieldname=${"total_score"}]`).find(".control-value").css({"font-weight": "bold","color":"orange"})
		}else{
			$(`[data-fieldname=${"total_score"}]`).find(".like-disabled-input").css({"font-weight": "bold","color":"red"})
		}
		
	},

	q1:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q2:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q3:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q4:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q5:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	qx:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q7:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q8:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q9:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q10:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q11:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q12:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q13:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q14:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q15:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q16:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q17:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q18:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q19:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q20:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q21:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q22:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q23:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q24:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q25:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q26:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q27:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q28:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q29:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q30:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q31:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q32:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q33:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q34:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q35:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q36:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q37:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q38:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q39:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q40:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q41:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q42:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	},

	q43:function(frm){
		frm.trigger("calculate_coding_score_and_coding_weight__points")
	}
})