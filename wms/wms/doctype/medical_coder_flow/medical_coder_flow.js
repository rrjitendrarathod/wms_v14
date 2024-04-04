frappe.ui.form.on('Medical Coder Flow', {  
  setup:(frm)=>{
      frappe.boot.sysdefaults.date_format = "mm-dd-yyyy";
      setup_rt_mitems(frm)
      setup_ct_mitems(frm)
      setup_none_mitems(frm)
      setup_ot_mitems(frm)
      setup_qact_mitems(frm)
      setup_qaot_mitems(frm)
      setup_qart_mitems(frm)
      setup_qanone_mitems(frm)
  },

  onload: function(frm){
    qa_notepad(frm);
      frm.trigger("based_on_hold_reason_data");
      hide_unwanted_sections(frm)
      qa_weightage_button(frm)
      observeOasisItemChanges(frm);
      //special_cases_hide_notepad(frm);
      
      //remove views
      // $('.form-viewers.d-flex').remove()
      // toggleCheckboxAndLabelMC(frm)

      if(frappe.user_roles.includes("QA")){
          toggleCheckboxAndLabel(frm);
      }   

      frm.trigger("get_team_lead_name")
      hide_response_before_workflow_action(frm)   
      child_table_copy_validation(frm)
      frm.trigger("readonly_after_mark_as_yes")
      disable_email_button()
      frm.trigger("toggle_fields_base_on_workflow_state")
      // set_filtered_mitems(frm)

      //Filter on mitems and qa_mitems
      frm.set_query("mitems", function(){
          var array = special_case_mitem_rules(frm)
          return {
              "filters":[
                  ["payortype", "=", frm.doc.mitem_payortype],
                  ["assessment_type" ,"=", frm.doc.assessment_type],
                  ["naming","=", frm.doc.testing_mid],
                  [ "mitems", "NOT IN", array],
              ] 
          };    
      })

      frm.set_query("qa_mitems", function() {
          var array =  special_case_mitem_rules_qa_side(frm)
          return {
              "filters": {
                  "payortype": frm.doc.mitem_payortype,
                  "assessment_type": frm.doc.assessment_type,
                  "naming": frm.doc.testing_mid,
                  "mitems":["NOT IN",array]
              }
          };
      })
      frm.trigger("mitem_mandatory");   
      remove_duplicate_button_in_child_table(frm) 
      upload_oasis_mitems(frm)

      if(["Pending Quality","QA Error Accepted by QA Manager","Coder Error Rejected by Department Head"].includes(frm.doc.workflow_state)){
        if (frm.doc.error_marked !== "No") {
          ['qa_weightage_button'].forEach(field => frm.fields_dict[field].$wrapper.show());
        }
      }
      hold_reason_import_file(frm)
    },
  
  refresh: function(frm){     
    qa_notepad(frm);
    cur_frm.page.sidebar.remove();
    frm.trigger("coloring_icd_codeqa_table_row");
    readonly_qa_fields(frm);
    frm.trigger("function_call_on_refresh")
    frm.trigger("invalid_form")
    qa_weightage_button(frm)
    frm.trigger("make_icd_qa_column_read_only")
    //frm.trigger("read_only_technical_issue");
    mitems_child_table_medicalcoder_qacoder(frm);    
    removed_pagination_oasis_item_table(frm)
    onhover_questions_oasisitem(frm)
    timeline_hideshow(frm)
    // frm.trigger("read_only_mitems_based_on_hold_reason")

    if ((cur_frm.doc.workflow_state == "Picked for Audit" || cur_frm.doc.workflow_state == "Pending Quality") && ("QA Lead").includes(frappe.boot.wms.role_profile)) {
      frm.set_df_property("branch","hidden",1)
    }

    // draft_state_hide_qa_coloumns(frm);  
    cur_frm.fields_dict["oasis_item"].$wrapper.find('.grid-body .rows').find(".grid-row").each(function(i, item) {
      let d = locals[cur_frm.fields_dict["oasis_item"].grid.doctype][$(item).attr('data-name')];
      if(d["redroad_response"] || d["qa_clinician_response"]){
        $(item).find('.grid-static-col').css({'background-color': '#aace9c'});
        $(item).find('.row-index').css({'background-color': '#aace9c'});
      }      
    });    
    restrict_pdx_field(frm);
    hold_reason_import_file(frm)
  },

  // The mitems function will be called on the refresh...
  // Already present hold_Reason or technical_issue is working on refresh and onload...
  read_only_mitems_based_on_hold_reason: function(frm){
    if (frm.doc.hold_reason || frm.doc.technical_issue) {
      return;
    }else{
      mitems_child_table_medicalcoder_qacoder(frm);
    }
  
  },

  make_icd_qa_column_read_only: function(frm){
    if(frappe.user_roles.includes("QA")){
      var icd_code = []
      frm.doc.icd_code.forEach(function(ele) {
          icd_code.push(ele.icd)
      })
      $.each(frm.doc.icd_codeqa, function(idx, value) {
          if (icd_code.includes(value.icd_qa)){
            cur_frm.get_field("icd_codeqa").grid.grid_rows[idx].columns.icd_qa.df.read_only = 1;
          }
      })
      frm.refresh_field('icd_codeqa')
    }
  },
  
  patient_reference_details: function(frm){
      // toggleVisibilityBasedOnRole(frm)
      frm.set_value('branch', frm.doc.mr_number.slice(0,3))           
      if(frm.doc.payor_type == "Medicaid"){
        var main_value = "Ma" + frm.doc.assessment_type.slice(0,2)
        frm.set_value("testing_mid", main_value);          
      }else{
        var main_value = frm.doc.payor_type.slice(0,2) + frm.doc.assessment_type.slice(0,2)
        frm.set_value("testing_mid", main_value)   
      }
    },

  pdx: function(frm){
    frm.set_value('pdx', frm.doc.pdx.toUpperCase());
    validate_pdx_field(frm)
  },

  pdpc_qa: function(frm){
      if(frm.doc.pdpc_qa){
            frm.toggle_reqd('pdpc_qa_comments', 1);
            $(`[data-fieldname= "pdpc_qa_comments" ]`).find(".control-label").css({"font-weight": "red","color":"red"})
      } else {
          frm.set_value('pdpc_qa_comments','')
          frm.toggle_reqd('pdpc_qa_comments', 0);
          $(`[data-fieldname= "pdpc_qa_comments" ]`).find(".control-label").css({"font-weight": "#333C44","color":"#333C44"})
      }
  },

  pdx_qa: function(frm,cdt,cdn){
      frm.set_value('pdx_qa', frm.doc.pdx_qa.toUpperCase());
      if (frm.doc.pdx_qa) {
        frm.toggle_reqd('pdx_qa_comments', 1);
        $(`[data-fieldname="pdx_qa_comments"]`).find(".control-label").css({"font-weight": "red", "color": "red"});
      } else {
        frm.toggle_reqd('pdx_qa_comments', 0);
        $(`[data-fieldname="pdx_qa_comments"]`).find(".control-label").css({"font-weight": "#333C44", "color": "#333C44"});
      }
      validate_pdx_qa_field(frm)

      // Check if the length of pdx_qa is more than 10 characters
      // if (frm.doc.pdx_qa && (frm.doc.pdx_qa.length < 3 || frm.doc.pdx_qa.length > 8)) {
      //   // frm.set_value("pdx_qa", frm.doc.pdx_qa.slice(0, 10))
      //   frappe.msgprint(__("PDX(QA): length should be between 3 and 8 characters."))
      // }
  },
  

  // No of Pages(QA)
  no_of_pages_qa: function(frm){
    if(frm.doc.no_of_pages_qa){
        frm.toggle_reqd('no_of_pages_qa_comments', 1);
        $(`[data-fieldname= "no_of_pages_qa_comments" ]`).find(".control-label").css({"font-weight": "red","color":"red"})
    } else {
        frm.toggle_reqd('no_of_pages_qa_comments', 0);
        $(`[data-fieldname= "no_of_pages_qa_comments" ]`).find(".control-label").css({"font-weight": "#333C44","color":"#333C44"})
    }
  },

  // type_qa: function(frm){
  //     if(frm.doc.type_qa != '--Select any one from the list--'){
  //         frm.toggle_reqd('type_qa_comments', 1);
  //         $(`[data-fieldname= "type_qa_comments" ]`).find(".control-label").css({"font-weight": "red","color":"red"})
  //     } else {
  //         frm.toggle_reqd('type_qa_comments', 0);
  //         $(`[data-fieldname= "type_qa_comments" ]`).find(".control-label").css({"font-weight": "#333C44","color":"#333C44"})
  //     }
  // },

  // ONSETEXACERBATION QA
  // onsetexacerbation_qa:function(frm){
  //     if(frm.doc.onsetexacerbation_qa != '--Select any one from the list--'){
  //         frm.toggle_reqd('onsetexacerbation_qa_comments', 1);
  //         $(`[data-fieldname= "onsetexacerbation_qa_comments" ]`).find(".control-label").css({"font-weight": "red","color":"red"})
  //     } else {
  //         frm.toggle_reqd('onsetexacerbation_qa_comments', 0);
  //         $(`[data-fieldname= "onsetexacerbation_qa_comments" ]`).find(".control-label").css({"font-weight": "#333C44","color":"#333C44"})
  //     }
  // },

  // SYMPTOM CONTROL RATING QA
  // symptom_control_rating_qa: function(frm){
  //     if(frm.doc.symptom_control_rating_qa != '--Select any one from the list--'){
  //         frm.toggle_reqd('symptom_control_rating_qa_comments', 1);
  //         $(`[data-fieldname= "symptom_control_rating_qa_comments"]`).find(".control-label").css({"font-weight": "red","color":"red"})
  //     } else {
  //         frm.toggle_reqd('symptom_control_rating_qa_comments', 0);
  //         $(`[data-fieldname= "symptom_control_rating_qa_comments" ]`).find(".control-label").css({"font-weight": "#333C44","color":"#333C44"})
  //     }
  // },

  cancer_treatments: function(frm){
      if(!frm.doc.cancer_treatments){
          frm.set_value("rt_mitems",'')
      }
  },

  respiratory_therapies: function(frm){
      if(!frm.doc.respiratory_therapies){
          frm.set_value("none_mitems",'')
      }
  },

  other: function(frm){
      if(frm.doc.other == 0){
          frm.set_value("ct_mitems",'')
      }
  },

  non_of_the_above: function(frm){
      if(frm.doc.non_of_the_above == 0){
          frm.set_value("ot_mitems",'')
      }
  },

  oasis_answer_change: function(frm){
    // toggleCheckboxAndLabelMC(frm);    
    frm.trigger("mitem_mandatory");
  },

  // mitem_mandatory: function(frm){
  //     var mc_fieldlist = ['cko','cancer_treatments','respiratory_therapies','other','none_of_the_above']
  //     if(frm.doc.oasis_answer_change == 'NO' || frm.doc.oasis_answer_change == '--Select any one from the list--'){
  //         frm.toggle_reqd('oasis_item', 0);
  //         frm.set_value("oasis_item",[])
  //         mc_fieldlist.forEach(function (field){
  //             frm.set_value(field,0)
  //         })
  //     } else {
  //         frm.toggle_reqd('oasis_item', 1);
  //     } 
  // },

  qa_weightage_button: function(frm) {
      if(frm.is_dirty() == true && (frm.doc.pdpc_qa != "" || frm.doc.no_of_pages_qa != "" || frm.doc.pdx_qa != "" || frm.doc.pdpc_qa_comments != ""  || frm.doc.pdx_qa_comments != "" || frm.doc.no_of_pages_qa_comments != "")){
            frappe.throw({
              title: __('Warning'),
              indicator: 'red',
              message: __('Please Save The Form Before Clicking on the QA Weightage Button')
            });
      } else if (frm.is_dirty() == true && frm.doc.error_marked == "Yes"){
          window.open("/app/qa-weightage/view/list/"+frm.doc.patient_reference_details+" ")
      } else {
          window.open("/app/qa-weightage/view/list/"+frm.doc.patient_reference_details+" ")
      }
  },

  validate: function(frm,cdt,cdn) {
      // validateNumberField(frm.doc.no_of_pages, "No of Pages");
      // validateNumberField(frm.doc.no_of_pages_qa, "No of Pages QA");
      frm.trigger("remove_mandatory")
      // o_series_mitem_validation_not_checked(frm)
      // check for special case mitems rules
      // check_oasis_child_table(frm)
      
      // check for special case qamitems rules
      // check_qa_mitems_child_table(frm)       

      frm.refresh_field("icd_code");
      frm.refresh_field("icd_codeqa");
      frm.trigger("remove_qa_comment")
      display_serial_numbers_in_icd_code()
      validate_sticky_notes_before_save(frm,cdt,cdn) 
      validate_pdx_save(frm) 
      validate_pdx_qa_save(frm)
      // check_oasis_validation(frm,cdt,cdn)
      assignemnt_date_val(frm)
  },

  remove_qa_comment: function(frm){
      if (!frm.doc.pdpc_qa){
          frm.set_value('pdpc_qa_comments','')
      }

      if(!frm.doc.pdx_qa){
          frm.set_value('pdx_qa_comments', '');
      }

      if (!frm.doc.no_of_pages_qa){
          frm.set_value('no_of_pages_qa_comments','')
      }

      // if(frm.doc.symptom_control_rating_qa=='--Select any one from the list--'){
      //     frm.set_value('symptom_control_rating_qa_comments', '')
      // }

      // if(frm.doc.type_qa=='--Select any one from the list--'){
      //     frm.set_value('type_qa_comments', '')
      // }

      // if(frm.doc.onsetexacerbation_qa=='--Select any one from the list--'){
      //     frm.set_value('onsetexacerbation_qa_comments', '')
      // }

  },

  //Not required
  remove_mandatory: function(frm){
      var fieldList = ["pdpc_qa_comments","pdx_qa_comments","no_of_pages_qa_comments"]   
      fieldList.forEach(function(field) {
          if(frm.doc[field] != ''){
              frm.toggle_reqd(field, 0);
              $(`[data-fieldname=${field}]`).find(".control-label").css({"font-weight": "#333C44","color":"#333C44"})
          }
      })
  },

  toggle_fields_base_on_workflow_state: function(frm){
      if(frappe.user_roles.includes('Medical Coder') && frappe.session.user != "Administrator" && !frappe.user_roles.includes("WMS Manager") && !frappe.user_roles.includes("Super Admin")){
          if(frm.doc.workflow_state == "Send to Medical Coder - Answer 1"){
              frm.toggle_enable(['pdpc', 'pdx','no_of_pages','type','icd','onsetexacerbation','symptom_control_rating','oasis_answer_change','sticky_notes_table','mitems','oasis_item','error_marked','qa_comments','clinician_name','question','cko','mitem','cancer_treatments','rt_mitems','other','ct_mitems','respiratory_therapies','none_mitems','none_of_the_above','ot_mitems','coding_post_problem','icd_codeqa','question1',"qa_icd_comments"], 1)
              frm.toggle_display(['coding_post_problem_amswer_comments'],1);
          }

          if(frm.doc.workflow_state == "Send to Medical Coder - Answer 2"){
              frm.toggle_enable(['pdpc', 'pdx','no_of_pages','type','icd','onsetexacerbation','symptom_control_rating','oasis_answer_change','sticky_notes_table','mitems','oasis_item','error_marked','qa_comments','clinician_name','question','cko','mitem','cancer_treatments','rt_mitems','other','ct_mitems','respiratory_therapies','none_mitems','none_of_the_above','ot_mitems','coding_post_problem','icd_codeqa','question2','qa_icd_comments'], 1)
              frm.toggle_display(['cppa'],1);
          }

          if(frm.doc.workflow_state == "Send to Medical Coder - Answer 3"){
              frm.toggle_enable(['pdpc', 'pdx','no_of_pages','type','icd','onsetexacerbation','symptom_control_rating','oasis_answer_change','sticky_notes_table','mitems','oasis_item','error_marked','qa_comments','clinician_name','question','cko','mitem','cancer_treatments','rt_mitems','other','ct_mitems','respiratory_therapies','none_mitems','none_of_the_above','ot_mitems','coding_post_problem','icd_codeqa','qa_icd_comments'], 1)
              frm.toggle_display(['cppa1'],1);
          }

          if(frm.doc.workflow_state == "Picked for Audit"){
              frm.toggle_enable(['pdpc', 'pdx','no_of_pages','type','icd','onsetexacerbation','symptom_control_rating','oasis_answer_change','sticky_notes_table','mitems','oasis_item','error_marked','qa_comments','clinician_name','question','cko','mitem','cancer_treatments','rt_mitems','other','ct_mitems','respiratory_therapies','none_mitems','none_of_the_above','ot_mitems','coding_post_problem','icd_codeqa','qa_icd_comments'], 0)

          }

          if (!["Coder Error Accepted by Department Head","Coder Error Accepted  by L2 supervisor - 1st Level Appeal","Coder Error Accepted by L2 Supervisor - 2nd Level Appeal"].includes(frm.doc.workflow_state)){
              frm.set_df_property("coder_error_comments", "read_only", 1);
          }

          if(frm.doc.workflow_state == "Clarification Required- Query 1"){
              frm.toggle_display(['coding_post_problem_amswer_comments','medical_coder_comments'],0);
          }

          if(frm.doc.workflow_state == "Clarification Required- Query 2"){
              frm.toggle_display(['cppa','medical_coder_comments'],0);
          }

          if(frm.doc.workflow_state == "Clarification Required- Query 3"){
              frm.toggle_display(['cppa1','medical_coder_comments'],0);
          }
      }

      if(frappe.user_roles.includes('Production TL') && frappe.session.user != "Administrator" && !frappe.user_roles.includes("WMS Manager") && !frappe.user_roles.includes("Super Admin")){
          if(frm.doc.workflow_state == "Draft" ){        
            frm.toggle_display(["clinician_name","question","column_break_30"], 0);           
          }
          if(frm.doc.workflow_state == "Clarification Required- Query 1"){
            frm.toggle_enable(['coding_post_problem_amswer_comments'], 1)
            frm.toggle_display(["clinician_name","question","column_break_30"], 1);           

          }
          if(frm.doc.workflow_state == "Clarification Required- Query 2"){
            frm.toggle_enable(['cppa'], 1)
            frm.toggle_display("question1", 1);
          }
          if(frm.doc.workflow_state == "Clarification Required- Query 3"){
            frm.toggle_enable(['cppa1'], 1);
            frm.toggle_display("question2", 1); 
          }

         

          if(frm.doc.workflow_state == "Send to Medical Coder - Answer 1" ){        
              frm.toggle_display("question1", 0);           
          }

          if(frm.doc.workflow_state == "Send to Medical Coder - Answer 2"){
              frm.toggle_display("question2", 0);           
          }
      }


  },

  get_team_lead_name:(frm)=>{
      frappe.call({
          method:"wms.wms.doctype.medical_coder_flow.medical_coder_flow.get_team_lead_name",
          args: {
              name:frm.doc.patient_reference_details,
          },
          callback:(r) => {
              if (r.message.length){
                  frm.set_value('team_lead',r.message[0].assigned_manager)
              }
          },
      })
  },

  invalid_form: function(frm){
      if(frm.doc.patient_reference_details == null){
          frappe.throw({
              title: ('Warning'),
              indicator: 'red',
              message: ('Invalid Form')
          });
      }
  },

  make_field_bold_onrefresh: function(frm){
      var fieldList = ["pdpc",
                  "coding_post_problem",
                  "coding_post_problem_amswer_comments",
                  "error_marked","coder_error_comments",
                  "qa_error_comments",
                  "accept_coder_error_by_dept_head",
                  "dept_head_comments",
                  "accept_qa_error_by_qa_manager",
                  "qam_comments","accept_coder_by_operation_manager",
                  "op_manager_comments_two",
                  "accept_coder_error_by_operations_manager_two",
                  "op_manager_comments","accept_error_from_qa_lead",
                  "qa_error_comment","accept_error_two",
                  "medical_coder_comments_two",
                  "accept_coder_error_from_qa_lead",
                  "team_lead_comments_by_qal_feedback",
                  "accept_qa_error_by_qal","qal_comments",
                  "accept_coder_error_from_coder",
                  "team_lead_comments","medical_coder_comments",
                  "coder_accept_error_from_qa",
                  "cppa",
                  "cppa1"
                ]   
      fieldList.forEach(function(field) {
          if(!frm.doc[field]){
              $(`[data-fieldname=${field}]`).addClass("bold");
          }
      })
  },

  bold_field_name: function(frm){
      $(`[data-fieldname=mr_number]`).find(".control-label").addClass("mr-number-highlight")    
  },

  coloring_icd_codeqa_table_row: function(frm){
      cur_frm.fields_dict["icd_codeqa"].$wrapper.find('.grid-body .rows').find(".grid-row").each(function(i, item) {
          let d = locals[cur_frm.fields_dict["icd_codeqa"].grid.doctype][$(item).attr('data-name')];        
          if(d["remove_icd"] == "Delete"){
            frm.trigger("make_icd_qa_column_read_only")
            $(item).find('.grid-static-col').css({'background-color': '#EEC8C0'});
          } else {
            frm.trigger("make_icd_qa_column_read_only")
            $(item).find('.grid-static-col').css({'background-color': '#fff'});   
          }
      });
  },

  technical_issue:function(frm){
    if (cur_frm.doc.technical_issue) {
      $('.actions-btn-group').hide();
    } else {
      $('.actions-btn-group').show();
    }
  },

  function_call_on_refresh: function(frm){        
      frm.trigger("make_field_bold_onrefresh")
      
      // use to bold the field name
      frm.trigger("bold_field_name")
      frm.trigger("set_assigned_by_readonly")
      
      remove_duplicate_button_in_child_table(frm)

      //Need To Explain
      // For the checkbox before saving the form for special cases
      // Setup validation for mc_tick and medical_coder_comments
      setupCheckboxValidation(frm, 'mc_tick', 'medical_coder_comments');
      // Setup validation for qa_tick and qa_error_comment
      setupCheckboxValidation(frm, 'qa_tick', 'qa_error_comment');
      // Setup validation for mc_tick_two and medical_coder_comments_two
      setupCheckboxValidation(frm, 'mc_tick_two', 'medical_coder_comments_two');
      // Setup validation for mc_tick_3 and medical_coder_comments_three
      setupCheckboxValidation(frm, 'mc_tick_3', 'medical_coder_comment3');

      // toggleCheckboxAndLabelMC(frm)
      if (frappe.user_roles.includes("QA")) {
          toggleCheckboxAndLabel(frm);
      }

      hide_qa_fields_section_based_no(frm);
      frm.trigger("based_on_hold_reason_data_make_fields_readonly");

      // readonly_for_other_workflow_states(frm)
      three_dot_menu(frm)

      frm.trigger("work_allocation_history_button")
      remove_assign_to_qa(frm)

      frm.trigger("hide_addRow_childTable")
      frm.trigger("remove_childTable")

      // hide the column break so if you change/add fields in doctype pass index according
      frm.trigger("hide_qa_column_break")
      frm.trigger("special_case_error_marked_by_qa_disable_save")
      frm.trigger("special_case_qa_error_acceptedby_qatl")
      frm.trigger("special_case_coder_error_acceptedby_l1_qatl_feedback")
      frm.trigger("special_case_coder_error_accepted_by_l1supervisor_1st_level_appeal")
      frm.trigger("show_hide_qa_section")
      //QA Weightage
      frm.trigger("export_qa_weightage")
      if(frappe.user_roles.includes('Medical Coder')){
          if(!frm.doc.mr_number){
              frm.set_value("chart_status","In-Progress");       
          }
      }
      if(frappe.user_roles.includes('QA Lead') && ["Picked for Audit", "Pending Quality"].includes(frm.doc.workflow_state)){
          frm.toggle_display("mr_number",0);
      }
  },
  remove_childTable:(frm)=>{
    var fieldList = ["icd_codeqa"] 
    fieldList.forEach(function(field) {
        $(`[data-fieldname=${field}]`).find(".grid-remove-rows").remove()
        $(`[data-fieldname=${field}]`).find(".grid-remove-all-rows").remove()     
    })

  },

  export_qa_weightage: function(frm){
    var wfc = ["Clarification Required- Query 1","Clarification Required- Query 2",
                "Clarification Required- Query 3","Send to Medical Coder - Answer 1",
                "Send to Medical Coder - Answer 2","Send to Medical Coder - Answer 3",
                'Draft','Production Completed', 'Picked for Audit', 'Pending Quality']
    if(!wfc.includes(frm.doc.workflow_state)) {
        frm.add_custom_button(__('QA Weightage'), function() {
            frappe.route_options = {"name": frm.doc.name};
            frappe.set_route("query-report", "QA Weightage");
        }).removeClass("btn-default").addClass("btn-primary")
    }
  },

  hide_qa_column_break: function(frm){
      if(["Draft","Clarification Required- Query 1","Send to Medical Coder - Answer 1","Clarification Required- Query 2","Send to Medical Coder - Answer 2","Clarification Required- Query 3","Send to Medical Coder - Answer 3","Production Completed"].includes(frm.doc.workflow_state)){
        $(".form-column.col-sm-4").eq(1).hide();
        $(".form-column.col-sm-4").eq(2).hide();
        $(".form-column.col-sm-4").eq(4).hide();
        $(".form-column.col-sm-4").eq(5).hide();
        $('.control-label:contains("QA Feedback")').hide();
      }
      
  },

  special_case_error_marked_by_qa_disable_save: function(frm){
    if (frm.doc.workflow_state == "Error Marked By QA" && !frm.doc.mc_tick){
      frm.disable_save();
    }
    if(!frm.doc.__unsaved){
      if(frm.doc.workflow_state == "Error Marked By QA" && frm.doc.coder_accept_error_from_qa == 'No'){

        // frm.toggle_display("hold_reason",1)
        frm.disable_save();
      }

      // read only 
      if (frm.doc.workflow_state == "Error Marked By QA" && frm.doc.coder_accept_error_from_qa && frm.doc.mc_tick){
          var fields = ["mc_tick",
                      "coder_accept_error_from_qa",
                      "medical_coder_comments",
                      "ot_mitems",
                      "none_of_the_above",
                      "none_mitems",
                      "respiratory_therapies",
                      "ct_mitems",
                      "other",
                      "rt_mitems",
                      "cancer_treatments",
                      "oasis_item",
                      "mitems",
                      "pdx","pdpc",
                      "no_of_pages",
                      "type",
                      "icd",
                      "onsetexacerbation",
                      "symptom_control_rating",
                      "oasis_answer_change",
                      "sticky_notes_table",
                      "hold_reason"
                      ]

          fields.forEach((field)=>{
              frm.set_df_property(field, "read_only", 1);
          })
      }
    }
      
  },

  special_case_qa_error_acceptedby_qatl: function(frm){
      if (frm.doc.workflow_state == "QA Error Accepted by QA TL" && !frm.doc.qa_tick){
        frm.disable_save();
      }

      // if(frm.doc.workflow_state == "QA Error Accepted by QA TL" && frm.doc.chart_status == "QA Error Accepted by QA TL" && frm.doc.accept_error_from_qa_lead == "No"){
      //     frm.disable_save();
      // }
  },

  special_case_coder_error_acceptedby_l1_qatl_feedback: function(frm){
      if (frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback" && !frm.doc.mc_tick_two){
        frm.disable_save();
      }

      // if(frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback" && frm.doc.accept_error_from_qa_lead == "No"){
      //     frm.disable_save();
      // }
  },

  special_case_coder_error_accepted_by_l1supervisor_1st_level_appeal: function(frm){
    if (frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal" && !frm.doc.mc_tick_3){
      frm.disable_save();
    }
    
    // if (frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal" && frm.doc.chart_status == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal" && frm.doc.error_based_on_feedback_received2 == "No"){
    //     frm.disable_save();
    // }
  },

  set_assigned_by_readonly: function(frm){
      setTimeout(()=>{
          frm.set_df_property('assigned_by', 'read_only', 1);
      },1000)
  },
  
  hide_addRow_childTable: function(frm){
      var fieldList = ["oasis_item","qa_table"] 
      fieldList.forEach(function(field) {
          $(`[data-fieldname=${field}]`).find(".grid-add-row").remove()
      })
  },

  based_on_hold_reason_data_make_fields_readonly: function(frm){
   
    if((frm.doc.workflow_state == "Coder 1st Level Appeal") && !frappe.user_roles.includes('Production TL')){
        frm.toggle_display("hold_reason",0);           
    } 
    else if (frappe.user_roles.includes('Production TL')){
      if (frm.doc.workflow_state == "Coder 1st Level Appeal"){
      // frm.toggle_enable(["accept_coder_error_from_coder", "team_lead_comments"], 1);
      frm.set_df_property('hold_reason','read_only',0);
      }
      if(['Coder Error Rejected by L1 supervisor - 1st Level Appeal',
          'Coder Error Rejected  by L1 supervisor-Post QA TL Feedback',
          'Coder Error Accepted  by L1 supervisor - 1st Level Appeal',
          'Coder Error Accepted  by L1 supervisor-Post QA TL Feedback'].includes(frm.doc.workflow_state)){
        frm.set_df_property('hold_reason','read_only',1);
      }
    }

    if((frm.doc.workflow_state == "Error Corrected by Coder") && !frappe.user_roles.includes('Production TL')){
      frm.toggle_display("hold_reason",0);             
    }

    disable_select_fields(frm,"Medical Coder",['Coder Error Accepted by Department Head',
                                              'Coder Error Accepted  by L1 supervisor - 1st Level Appeal',
                                              'Coder Error Accepted  by L1 supervisor-Post QA TL Feedback'])    

    if(frappe.user_roles.includes("QA Inventory Allocation")){
      if(['Production Completed'].includes(frm.doc.workflow_state)){
        frm.set_df_property("hold_reason","read_only",0);
      }
      if(['Picked for Audit'].includes(frm.doc.workflow_state)){
        frm.set_df_property("hold_reason","read_only",1);
      }
    }
    if(frappe.user_roles.includes("QA Lead")){
      if(['Picked for Audit'].includes(frm.doc.workflow_state)){
        frm.set_df_property("hold_reason","read_only",0);
      }
      if(['QA Error Rejected  by QA TL',
          'QA Error Accepted by QA TL',
          "QA Manager Review - Coder Error Rejected by L2 Supervisor - 2nd Level Appeal",
          "Department Head Review - QA Error Rejected by QA Manager",
          "Pending Quality"].includes(frm.doc.workflow_state)){
        frm.set_df_property("hold_reason","read_only",1);
      }     

    }
    if(frappe.user_roles.includes("Medical Coder")){        
      if(['Coder 2nd Level Appeal'].includes(frm.doc.workflow_state)){
        frm.set_df_property("hold_reason","read_only",1);
      }       
    }
    // Removing the Hold Reason and saving the form then QA Select fields are getting editable
    disable_select_fields(frm,"Medical Coder",['Error Marked By QA'])
    disable_select_fields(frm,"QA Lead",['Coder Error Rejected by L1 supervisor - 1st Level Appeal'])
    disable_select_fields(frm,"Production TL",['Error Corrected by Coder',"Coder 1st Level Appeal","Error Corrected by QA","QA Error Rejected  by QA TL"])
    disable_select_fields(frm,"Operations Manager",['Operations Manager Review - 2nd Level Appeal'])
    disable_select_fields(frm,"QA Manager",['QA Manager Review - Coder Error Rejected by L2 Supervisor - 2nd Level Appeal'])
    disable_select_fields(frm,"Department Head",['Department Head Review - QA Error Rejected by QA Manager']);
    // disable_select_fields(frm,"QA",['Pending Quality']);

  },

  based_on_hold_reason_data: function(frm) {    
    if (!frm.is_new() && (frm.doc.hold_reason || frm.doc.technical_issue)) {
      frm.fields.forEach(function(field) {
          var fieldName = field.df.fieldname;
          if (fieldName !== 'hold_reason' && frm.doc.hold_reason) {
            frm.set_df_property(fieldName,'read_only',1);
            frm.set_df_property("technical_issue","read_only",1);
          }
          if (fieldName !== 'technical_issue' && frm.doc.technical_issue) {
            frm.set_df_property(fieldName,'read_only',1);
            frm.set_df_property("hold_reason","read_only",1)
          }          
      });
      frm.doc.__isread = 1; 
      frm.refresh_fields();    
    } 
    else {
      frm.fields.forEach(function(field) {
        var fieldName = field.df.fieldname;
        frm.set_df_property(fieldName,'read_only',0);
      });
      frm.doc.__isread = 0;
    }
  },

hold_reason:function(frm){ 
    frm.enable_save()    
    if(frm.doc.hold_reason){
      frm.set_df_property("import_file","read_only",0)
      frm.set_df_property("technical_issue","read_only",1)
    }else{
      frm.set_value("import_file","")
      frm.set_df_property("import_file","read_only",1)
    }
  },
  
  technical_issue:function(frm){
    frm.enable_save()
    if(frm.doc.technical_issue){
      frm.set_df_property("hold_reason","read_only",1)
    }
  },

  work_allocation_history_button: function(frm){
      if (frm.doc.work_allocation_activity_history && (frappe.user_roles.includes('Production TL') || frappe.user_roles.includes('QA Lead') || frappe.user_roles.includes("Operations Manager") || frappe.user_roles.includes("QA Manager")|| frappe.user_roles.includes("Department Head") ||  frappe.user_roles.includes("Administrator") || frappe.user_roles.includes("WMS Manager") || frappe.user_roles.includes("Super User"))){
          frm.add_custom_button(__('Work Allocation History'), () => {
              window.open("/app/work-allocation-activity-history/"+frm.doc.patient_reference_details+" ")
          }).removeClass("btn-default").addClass("btn-primary")
      }
  },

  coder_accept_error_from_qa: function(frm){
      var fields = ["ot_mitems",
                    "none_of_the_above",
                    "none_mitems",
                    "respiratory_therapies",
                    "ct_mitems",
                    "other",
                    "rt_mitems",
                    "cancer_treatments",
                    "oasis_item",
                    "mitems",
                    "pdx",
                    "pdpc",
                    "no_of_pages",
                    "type",
                    "icd",
                    "onsetexacerbation",
                    "symptom_control_rating",
                    "oasis_answer_change",
                    "sticky_notes_table"
                  ]

      if(frm.doc.workflow_state == "Error Marked By QA" && frm.doc.coder_accept_error_from_qa == "Yes"){
        show_notepad(frm)
        frm.toggle_display('hold_reason',0);
        console.log("error")
          fields.forEach((field)=>{
              frm.set_df_property(field, "read_only", 0);
          })

          var fields_read = ["coding_post_problem",
                              "clinician_name",
                              "question",
                              "question1",
                              "question2",
                              "icd_codeqa",
                              "qa_icd_comments"
                            ]
          
          fields_read.forEach((field)=>{
              frm.set_df_property(field, "read_only", 1);
          })
          frm.refresh_field("icd_code");
          frm.refresh_field("sticky_notes_table");       
          frm.refresh_field("workflow_state");
          frm.refresh_field("icd_codeqa")
      }

      if(frm.doc.workflow_state == "Error Marked By QA"  && frm.doc.coder_accept_error_from_qa == "No"){
        $('[data-fieldname="notepad"]').hide();
        frm.toggle_display("hold_reason",1)
          frm.reload_doc()
      }
      setTimeout(function() {
        $('.form-column.col-sm-6 .form-grid .row-index').show()
      }, 100);
  },

  accept_error_from_qa_lead: function(frm){
      if(frm.doc.workflow_state == "QA Error Accepted by QA TL" && frm.doc.accept_error_from_qa_lead == "Yes"){
          show_notepad(frm)
          frm.toggle_display("hold_reason",0)
          readonly_qa_fields(frm)
          var fields = ["pdpc_qa",
                        "no_of_pages_qa",
                        "pdx_qa",
                        "icd_code_qa",
                        "qa_mitems",
                        "qa_table"
                      ]

          fields.forEach((field)=>{
              frm.set_df_property(field, "read_only", 0);
          })
          
        
          frm.refresh_field("qa_table")
          var qa_comments_feedback = ["pdpc_qa_comments",
                                  "no_of_pages_qa_comments",
                                  "pdx_qa_comments", 
                                 ]
          //  QA Comments Feedback
          qa_comments_feedback.forEach((field)=>{
              frm.set_df_property(field, "read_only", 0);
          })

          var qa_o_series_mitems = ["mitem",
                                "qact",
                                "qact_mitems","qaot",
                                "qaot_mitems",
                                "qart",
                                "qart_mitems",
                                "qanone",
                                "qanone_mitems",
                                "icd_codeqa",
                                "qa_icd_comments"
                              ]

          // QA O series Mitems
          qa_o_series_mitems.forEach((field)=>{
              frm.set_df_property(field, "read_only", 0);
          })
          frm.toggle_display("qa_weightage_button", 1)
          frm.set_df_property("oasis_item","read_only",0);
      }
      
      if(frm.doc.workflow_state == "QA Error Accepted by QA TL"  && frm.doc.accept_error_from_qa_lead == "No"){
        frm.toggle_display("notepad", 0)
      //  frm.toggle_display(['sticky_notes_table_section'],0);
        frm.toggle_display("hold_reason",1)
        frm.reload_doc();

        var comments_field = ['pdpc_qa_comments','pdx_qa_comments','no_of_pages_qa_comments']
        comments_field.forEach(function (field){
          frm.toggle_reqd(field,0)
          $(`[data-fieldname= ${field} ]`).find(".control-label").css({"font-weight": "#333C44","color":"#333C44"})
        })     
      } 
      
    setTimeout(function() {
      $('.form-column.col-sm-6 .form-grid .row-index').show()
    }, 100);
  },

  qact: function(frm){
      updateReadonlyProperty(frm, 'qact', frm.doc.qact_mitems);
  },

  qart: function(frm){
      updateReadonlyProperty(frm, 'qart', frm.doc.qart_mitems);
  },

  qaot: function(frm){
      updateReadonlyProperty(frm, 'qaot', frm.doc.qaot_mitems);
  },

  qanone: function(frm){
      updateReadonlyProperty(frm, 'qanone', frm.doc.qanone_mitems);
  },

  qact_mitems: function(frm){
      if(frm.doc.qact_mitems.length > 0){
          frm.set_df_property('rs_qact_mitems','read_only',0)
      } else {
          frm.set_value('rs_qact_mitems','')
          frm.set_df_property('rs_qact_mitems','read_only',1)
      }
  },

  qart_mitems: function(frm){
      if(frm.doc.qart_mitems.length > 0){
          frm.set_df_property('rs_qart_mitems','read_only',0)
      } else {
          frm.set_value('rs_qart_mitems','')
          frm.set_df_property('rs_qart_mitems','read_only',1)
      }
  },

  qaot_mitems: function(frm){
      if(frm.doc.qaot_mitems.length > 0){
          frm.set_df_property('rs_qaot_mitems','read_only',0)
      } else {
          frm.set_value('rs_qaot_mitems','')
          frm.set_df_property('rs_qaot_mitems','read_only',1)
      }
  },

  qanone_mitems: function(frm){
      if(frm.doc.qanone_mitems.length > 0){
          frm.set_df_property('rs_qanone_mitems','read_only',0)
      } else {
          frm.set_value('rs_qanone_mitems','')
          frm.set_df_property('rs_qanone_mitems','read_only',1)
      }
  },

  coding_post_problem: function(frm){
      clinical_name_question_manadatory_yes(frm)
      clinical_name_question_manadatory_no(frm)
  },

  accept_error_two: function(frm){
      var fields = [ "ot_mitems",
                    "none_of_the_above",
                    "none_mitems",
                    "respiratory_therapies",
                    "ct_mitems",
                    "other",
                    "rt_mitems",
                    "cancer_treatments",
                    "oasis_item",
                    "mitems",
                    "pdx",
                    "pdpc",
                    "no_of_pages",
                    "type",
                    "icd",
                    "onsetexacerbation",
                    "symptom_control_rating",
                    "oasis_answer_change",
                    "sticky_notes_table"
                  ]

      if(frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback" && frm.doc.accept_error_two == "Yes"){
        show_notepad(frm)
        frm.toggle_display("hold_reason",0)
          fields.forEach((field)=>{
              frm.set_df_property(field, "read_only", 0);
          })

          var fields_read = ["coding_post_problem","clinician_name","question","question1","question2","icd_codeqa","qa_icd_comments"]
          fields_read.forEach((field)=>{
              frm.set_df_property(field, "read_only", 1);
          }) 

          frm.refresh_field("icd_code");
          frm.refresh_field("sticky_notes_table");       
          frm.refresh_field("workflow_state");
          frm.refresh_field("icd_codeqa")

      }

      if(frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback" && frm.doc.accept_error_two == "No"){
        $('[data-fieldname="notepad"]').hide();
          frm.toggle_display("hold_reason",1)
          frm.reload_doc()
      }
  },

  error_based_on_feedback_received2: function(frm){
      var fields = [ "ot_mitems",
                    "none_of_the_above",
                    "none_mitems",
                    "respiratory_therapies",
                    "ct_mitems",
                    "other",
                    "rt_mitems",
                    "cancer_treatments",
                    "cko","oasis_item",
                    "mitems",
                    "pdx",
                    "pdpc",
                    "no_of_pages",
                    "type",
                    "icd",
                    "onsetexacerbation",
                    "symptom_control_rating",
                    "oasis_answer_change",
                    "sticky_notes_table"
                  ]

      if(frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal" && frm.doc.error_based_on_feedback_received2 == "Yes"){
          show_notepad(frm)
          frm.toggle_display("hold_reason",0);
          fields.forEach((field)=>{
              frm.set_df_property(field, "read_only", 0);
          })

          var fields_read = ["coding_post_problem",
                          "clinician_name",
                          "question",
                          "question1",
                          "question2",
                          "icd_codeqa",
                          "qa_icd_comments"
                        ]
      
          fields_read.forEach((field)=>{
              frm.set_df_property(field, "read_only", 1);
          })
          frm.refresh_field("icd_code");
          frm.refresh_field("sticky_notes_table");       
          frm.refresh_field("workflow_state");
          frm.refresh_field("icd_codeqa")
      }

      if(frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal" && frm.doc.error_based_on_feedback_received2 == "No"){
          $('[data-fieldname="notepad"]').hide();
          frm.toggle_display("hold_reason",1)
          frm.reload_doc()
          
      }
  },

  error_marked: function(frm){

      if (frm.doc.error_marked == "Yes")
        {frm.set_value("notepad","")}

      else if (frm.doc.error_marked == "No" || frm.is_new)
        {$('[data-fieldname="notepad"]').hide();}

      if (frappe.user_roles.includes("QA")){
        toggleCheckboxAndLabel(frm);
      }

      if (frm.doc.error_marked == "No"){
          frm.clear_table("icd_codeqa");
          frm.doc.sticky_notes_table.map((notes)=>{
              var row_qa = frm.add_child("icd_codeqa")
              row_qa.icd_qa = notes.first_diagnostics
              row_qa.is_diagnostics = 1
          })
      }

      frm.refresh_field("icd_codeqa");
      if (frm.doc.qa_icd_comments){
          frm.set_value("qa_icd_comments","")  
      }
      frm.toggle_reqd('qa_icd_comments',0);
  },

  before_workflow_action : async(frm) => {
    qa_notepad(frm);
      if(frm.doc.hold_reason || frm.doc.technical_issue){  
          frappe.throw({
              title: __('Warning'),
              indicator: 'orange',
              message: __(`Please Remove the <b>Hold Reason</b> or <b>Technical_issue </b><Data`)
          });
      } 
      else { 
        try {
          await check_qa_weightage_submited(frm);
        } catch (error) {
          frappe.throw(error);
        }      
        mandatory_fields_to_condition_based(frm)
        let promise = new Promise((resolve,reject) =>{   
            frappe.confirm('Are you sure you want to proceed?',
                () => resolve(),
                () => reject()
            )
        
        });
        await promise.catch(() => frappe.throw());
      }
  
      // const state = frm.doc.workflow_state.slice(15);       
      if(frappe.user_roles.includes('QA Lead') && frm.doc.workflow_state =="Picked for Audit" && !frm.doc.employee){
          frappe.throw('Please enter QA name in Assign To before proceeding')
      }   
  
      const draft_state = frm.doc.workflow_state;

      if(frappe.user_roles.includes("Medical Coder")){
          if(!frm.doc.pdpc){
              var pdpc = "PDPC"
              frm.scroll_to_field("pdpc")
              frappe.throw({
                  title: __('Warning'),
                  indicator: 'red',
                  message: __(`Please enter <b>${pdpc}</b> before proceeding`)
              });
          } else if(!frm.doc.pdpc){
              var pdpc = "PDPC"
              frm.scroll_to_field("pdpc")
              frappe.throw({
                  title: __('Warning'),
                  indicator: 'red',
                  message: __(`Please enter <b>${pdpc}</b> before proceeding`)
              });
          }    
      }

    if((frm.doc.workflow_state =="Coder Error Accepted by Department Head" ||frm.doc.workflow_state =="Coder Error Accepted by L2 supervisor - 1st Level Appeal"||frm.doc.workflow_state =="Send to Medical Coder - Answer 1"||frm.doc.workflow_state =="Send to Medical Coder - Answer 2"||frm.doc.workflow_state =="Send to Medical Coder - Answer 3"||frm.doc.workflow_state =="Pending Quality"||frm.doc.workflow_state =="QA Error Accepted by QA Manager"||frm.doc.workflow_state =="Coder Error Rejected by Department Head")){
      frm.set_value("notepad","<p></p>") 
    }
    if (cur_frm.doc.workflow_state == "Production Completed" && ("Medical Coder").includes(frappe.boot.wms.role_profile)) {
      frm.set_value("notepad","")
      frm.toggle_display("notepad", 0)
    }
  
    if ((cur_frm.doc.action == "Error Marked by QA" || cur_frm.doc.action == "No Error") && ("QA").includes(frappe.boot.wms.role_profile)) {
      frm.set_value("notepad","")
      frm.toggle_display("notepad", 0)

    }	  
    // if(frm.doc.workflow_state == "Error Marked By QA" && frappe.user_roles.includes("QA")){
    //   frm.set_value("notepad","") 
    //   frm.toggle_display("notepad", 0)
    //   //frm.toggle_display(['sticky_notes_table_section'],0);
    // }

  },

  after_workflow_action:(frm)=>{
      // frm.trigger("update_work_allocation_activity_history")    
      if((frm.doc.workflow_state == "Operations Manager Review - 2nd Level Appeal"|| frm.doc.workflow_state == "Operations Manager Review - Coder Error Rejected  by L1 supervisor") && frappe.user_roles.includes("Operations Manager")){
          window.location.reload()
      }

      if(frm.doc.workflow_state == "QA Manager Review - Coder Error Rejected  by L2 supervisor - 1st Level Appeal" || frm.doc.workflow_state == "QA Manager Review - Coder Error Rejected by L2 Supervisor - 2nd Level Appeal" || frm.doc.workflow_state == "QA Manager Review - QA Appeal"){
          window.location.reload()
      }

      if(frm.doc.workflow_state == "Department Head Review - QA Error Rejected by QA Manager"){
          frm.set_df_property("accept_coder_error_by_dept_head", "read_only", 0);
          frm.set_df_property("dept_head_comments", "read_only", 0);
      } 
     if((frm.doc.workflow_state == "Error Marked By QA")&&frappe.user_roles.includes("QA")){
      frm.set_value("notepad","<p></p>")
      frm.save()
     }
  },

  update_work_allocation_activity_history:(frm)=>{

      // use to update when workflow state change
      if(frm.doc.workflow_state){
          if (frm.get_docinfo().workflow_logs){
              frappe.call({
                  method:"wms.wms.doctype.medical_coder_flow.medical_coder_flow.update_work_allocation_activity_history",
                  args:{
                      name:frm.doc.name,
                      workflow_state:frm.doc.workflow_state,
                      worlflow_list:frm.get_docinfo().workflow_logs,
                      creation:frm.doc.creation,
                      coder_name:frm.doc.coder_name,
                      coder_assign_date:frm.doc.coder_assign_datetime,
                      patient_reference_details:frm.doc.patient_reference_details,
                      assignment_logs:frm.get_docinfo().assignment_logs,
                      assignments:frm.get_docinfo().assignments,
                      assign_to_qa_datetime:frm.doc.assign_to_qa_datetime,
                      assign_qa_email:frm.doc.email,
                      qa_reassign_table:frm.doc.qa_reassign_table,
                      qa_lead_reassign_table:frm.doc.qa_lead_assign_table,
                      current_assign_qa_tl:frm.doc.assigned_by,
                      final_chart_status_datetime:frm.doc.final_chart_status_datetime,
                      hold_reason_history1:frm.doc.hold_reason_history1
                  },
                  btn: $('.primary-action'),
              })
           }
      }
  },

  before_save: async(frm)=>{   

    
   
      if(frm.doc.chart_status == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback" && frm.doc.accept_error_two == "No"){      
          frm.set_value('coder_error_comments', '');    
      }    
      
      if(frm.doc.chart_status == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal" && frm.doc.accept_error_two == "No"){      
          frm.set_value('coder_error_comments', '');    
      } 
     
      if(frm.doc.chart_status == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal" && frm.doc.accept_error_two == "No"){
          frm.set_value('coder_error_comments', '');
      }


      // wms 642
      // Error Marked By QA
      if(['Yes','No'].includes(frm.doc.coder_accept_error_from_qa)&& ["Error Marked By QA"].includes(frm.doc.workflow_state) &&  ["Medical Coder"].includes(frappe.boot.wms.role_profile)){
        if(frm.doc.mc_tick){
          frm.set_value("hold_reason",'')   
            let promise = new Promise((resolve,reject) =>{   
                let d = frappe.confirm('Are you sure you want to proceed? Changes made cannot be rolled back',
                    () => resolve(),
                    () => reject()
                )
                $(d.wrapper).find(".btn-primary").removeClass("btn-primary").addClass("btn-danger")
            });
            await promise.catch(() => frappe.throw());
        }
        
       
    }

    // QA Error Accepted by QA TL
    if(['Yes','No'].includes(frm.doc.accept_error_from_qa_lead) && ["QA Error Accepted by QA TL"].includes(frm.doc.workflow_state)){
      if(frm.doc.qa_tick){         
        frm.set_value("hold_reason",'')       
        let promise = new Promise((resolve,reject) =>{   
            let d = frappe.confirm('Are you sure you want to proceed? Changes made cannot be rolled back',
                () => resolve(),
                () => reject()
            )
            $(d.wrapper).find(".btn-primary").removeClass("btn-primary").addClass("btn-danger")
        });
        await promise.catch(() => frappe.throw());
      }            
    }

    // Coder Error Accepted  by L1 supervisor-Post QA TL Feedback
    if(['Yes','No'].includes(frm.doc.accept_error_two) && ["Coder Error Accepted  by L1 supervisor-Post QA TL Feedback"].includes(frm.doc.workflow_state)){
       if(frm.doc.mc_tick_two) {
        frm.set_value("hold_reason",'')
            let promise = new Promise((resolve,reject) =>{   
                let d = frappe.confirm('Are you sure you want to proceed? Changes made cannot be rolled back',
                    () => resolve(),
                    () => reject()
                )
                $(d.wrapper).find(".btn-primary").removeClass("btn-primary").addClass("btn-danger")
            });
            await promise.catch(() => frappe.throw());
        }
    }

    // Coder Error Accepted  by L1 supervisor - 1st Level Appeal
    if(['Yes','No'].includes(frm.doc.error_based_on_feedback_received2) && ["Coder Error Accepted  by L1 supervisor - 1st Level Appeal"].includes(frm.doc.workflow_state)){
        if(frm.doc.mc_tick_3) {
          frm.set_value("hold_reason",'')
            let promise = new Promise((resolve,reject) =>{   
                let d = frappe.confirm('Are you sure you want to proceed? Changes made cannot be rolled back',
                    () => resolve(),
                    () => reject()
                )
                $(d.wrapper).find(".btn-primary").removeClass("btn-primary").addClass("btn-danger")
            });
            await promise.catch(() => frappe.throw());
        }
      
    }
    frm.trigger("make_oseries_mitems_null");
    
},    

qa_tick:function(frm){
  if(frm.doc.qa_tick){
    frm.toggle_reqd(["qa_error_comment"],1)
  }
  else{
    // frm.set_value('qa_error_comment','')
    frm.toggle_reqd(["qa_error_comment"],0)
  }    
},

mc_tick:function(frm){
  if(frm.doc.mc_tick){
    frm.toggle_reqd(["medical_coder_comments"],1)
    frm.toggle_reqd(["pdpc"],1)
  }
  else{
    // frm.set_value('medical_coder_comments','')
    frm.toggle_reqd(["medical_coder_comments"],0)
    frm.toggle_reqd(["pdpc"],0)

  }
  
},
mc_tick_two:function(frm){
  if(frm.doc.mc_tick_two){
    frm.toggle_reqd(["medical_coder_comments_two"],1)
    frm.toggle_reqd(["pdpc"],1)
  }
  else{
    // frm.set_value('medical_coder_comments_two','')
    frm.toggle_reqd(["medical_coder_comments_two"],0)
    frm.toggle_reqd(["pdpc"],0)
  }
  
},
mc_tick_3:function(frm){
  if(frm.doc.mc_tick_3){
    frm.toggle_reqd(["medical_coder_comment3"],1)
    frm.toggle_reqd(["pdpc"],1)
  }
  else{
    // frm.set_value('medical_coder_comment3','')
    frm.toggle_reqd(["medical_coder_comment3"],0)
    frm.toggle_reqd(["pdpc"],0)
  }
  
},

  make_oseries_mitems_null:(frm)=>{
      if(frm.doc.cancer_treatments==1 || frm.doc.respiratory_therapies==1 || frm.doc.other==1){
          frm.set_value('ot_mitems','');
      }
  },

  after_save:(frm)=>{   
      frm.trigger("based_on_hold_reason_data");
      after_save_show_fields(frm)
      // frm.trigger("read_only_mitems_based_on_hold_reason");
      if(frm.doc.workflow_state == "Pending Quality"){
      if (frm.doc.error_marked !== "No") {
        ['pdpc_qa','pdpc_qa_comments','pdx_qa','pdx_qa_comments','no_of_pages_qa','no_of_pages_qa_comments',
         ,'icd_codeqa', 'oasis_item','qa_weightage_button'
        ].forEach(field => frm.fields_dict[field].$wrapper.show());

        frm.toggle_display(['section_break_121'],1)

        $('.control-label:contains("QA Feedback")').show();
        $('.control-label:contains("QA Comments")').show();
        //$(`[data-fieldname="notepad"]`).show();
        frm.toggle_display("notepad",1);
        frm.refresh_field("notepad");
        //frm.toggle_display(['sticky_notes_table_section'],1);
        frm.set_df_property("oasis_item","read_only",0);
      }
      check_qa_weightage_button_is_visible(frm)
    }
  
      frm.trigger("qa_weightage_button_hide_on_save")
      frm.trigger("readonly_after_mark_as_yes")
      
      // monkey patch
      if(frm.doc.accept_error_two === "Yes" && frappe.user_roles.includes("Medical Coder")){
          if(frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal" && frm.doc.chart_status == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal"){
              window.location.reload()
          } else if (frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback" && frm.doc.chart_status == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback"){
              window.location.reload()
          }
      }
  },

  readonly_after_mark_as_yes:(frm)=>{
      if(frm.doc.accept_error_two == "Yes"){
          frm.set_df_property("accept_error_two", "read_only", 1);
      }

      if(frm.doc.accept_error_from_qa_lead == "Yes"){
          frm.set_df_property("accept_error_from_qa_lead", "read_only", 1);
      }   
  },

  qa_weightage_button_hide_on_save:(frm)=>{
      if(frappe.user_roles.includes('QA')) {
          if(["QA Error Accepted by QA TL"].includes(frm.doc.workflow_state)){
              frm.toggle_display("qa_weightage_button", 0)
          }
      }
  },

  show_hide_qa_section: function(frm){
      if(frappe.user_roles.includes('Production TL') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
          if(frm.doc.workflow_state == "Clarification Required- Query 1" || frm.doc.workflow_state == "Clarification Required- Query 2" || frm.doc.workflow_state == "Clarification Required- Query 3" || frm.doc.workflow_state == "Production Completed"){
              frm.toggle_display(["qa_team_lead_section","qa_section"]);
          }
          if(frm.doc.workflow_state == "Send to Medical Coder - Answer 1" || frm.doc.workflow_state == "Send to Medical Coder - Answer 2" || frm.doc.workflow_state == "Send to Medical Coder - Answer 3" || frm.doc.workflow_state == "Production Completed"){
              frm.toggle_display(["qa_team_lead_section","qa_section"]);
          }
      }

      if(!frappe.user_roles.includes('Medical Coder') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')) {  
        frm.toggle_display("sticky_notes_table");   
      } 

      // if(!frappe.user_roles.includes('QA') && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin') && (["In-Progress","Draft","Production Completed","Clarification Required "].includes(frm.doc.chart_status)) || ["Clarification Required- Query 2","Send to Medical Coder - Answer 1","Send to Medical Coder - Answer 2","Send to Medical Coder - Answer 3","Clarification Required- Query 3"].includes(frm.doc.workflow_state)  ){  
      //     frm.toggle_display(["check_for_o_series_mitems"]);   
      // } 

      if(!frappe.user_roles.includes('QA') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
          frm.set_df_property("icd_codeqa", "read_only", 1);
          frm.set_df_property("qa_icd_comments","read_only",1)
      }

      if(!frappe.user_roles.includes('Department Head') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
          frm.set_df_property("dept_head_comments", "read_only", 1);
      }

      if(!frappe.user_roles.includes('QA Manager')&& frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
          frm.set_df_property("qam_comments", "read_only", 1);
      }

      if(!frappe.user_roles.includes('Operations Manager') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
          frm.set_df_property("op_manager_comments", "read_only", 1);
          frm.set_df_property("op_manager_comments_two", "read_only", 1);
      }

      if(["QA Inventory Allocation" ,"QA Manager","QA", "QA Lead"].includes(frappe.boot.wms.role_profile)){
        frm.toggle_display(["coding_post_problem_section","column_break_30","section_break_79"]); 
      }
  },   
});

//Mitems Single Picklist and Multiple Picklist 

frappe.ui.form.on('Medical Coder Flow', 'mitems', function(frm, cdt, cdn) 
{
  const target_row = locals[cdt][cdn];
  const item_name = target_row.mitems;    

  if (item_name) 
    {
      frappe.model.with_doc('MItem Values', item_name, function () 
        {
          const item_doc = frappe.model.get_doc('MItem Values', item_name);      
          
          
          //Mitems  Picklist
          
          frm.set_value('mitems', '');
          var m_name = item_doc.mitems;            
          var m_questions = item_doc.questions;  
          
          //MITEM MULiple Picklist 
          
          const second_response = item_doc.multiple

          var multiple_sec_sub_type_list = [];
          for (var x = 0; x < second_response.length; x++) {
            multiple_sec_sub_type_list[x] = second_response[x]['multiple_values'];						
          }
          
         

          //SinglePicklist MItems
          const clinical_response = item_doc.sub_values

          var sub_type_list = [];
          for (var x = 0; x < clinical_response.length; x++) {
            sub_type_list[x] = clinical_response[x]['sub_values'];						
          }
          
          let duplicate_mitem = null;
          duplicate_mitem = (frm.doc.oasis_item || []).filter((item)=> item.oasis_items ===  item_doc.mitems)        

          if(duplicate_mitem.length != 0){
            var oasis_items= duplicate_mitem[0].oasis_items
            frappe.msgprint({
              title: __('Warning'),
              indicator: 'orange',
              message: __(`Same Mitem <b>${oasis_items}</b> Number Already Exists`)
            });
           
          }

          else if(item_doc.picklist == "SinglePicklist")
          {

            var alertEnabled = true;
            let d = new frappe.ui.Dialog
            (
              { 
              title: 'M Items',
              fields: 
                [                   
                  {
                    fieldtype: 'Data',				
                    fieldname: 'Mitems',
                    label: __("M Items"),
                    default : m_name,
                    read_only : "1",                   
                  },
                  {
                    fieldtype: 'Data',				
                    fieldname: 'questions',
                    label: __("Question"),
                    default : m_questions,
                    read_only : "1",                    
                  },
              
                  {
                    fieldtype: 'Select',				
                    fieldname: 'first_clinical',
                    label: __("Clinician Response"),
                    options : sub_type_list,
                    reqd : 1,
                    onchange:function(e)
                    {
                      single_picklist_value(d)
                    }
                   
                                      
                  },
        
                  {
                    fieldtype: 'Select',				
                    fieldname: 'second_redroad',
                    label: __("Redroad Coder Response"),
                    options : sub_type_list,
                    reqd : 1,
                    onchange:function(e)
                    {
                      single_picklist_value(d)
                      
                    }
                                        
                  },                   

                  {
                    label: __("Reason for change"),
                    fieldtype: 'Small Text',
                    fieldname: 'reason_description',
                    reqd: true, 
                  },

                  
                ],

                primary_action_label: 'Submit',
                primary_action(values) 
                {     

                  let valuesAdded = false;
                  $('.standard-actions').on('click', function () {
                    if ($(this).css('display') === 'none') {
                      frappe.msgprint({
                        title: __('Message'),
                        indicator: 'orange',
                        message: 'Responses cannot be same',
                      });
                      valuesAdded = true;
                    } else if (!valuesAdded) {
                      // Values have not been added yet, so add them
                      let entry = frm.add_child("oasis_item");
                      entry.naming_oasis = item_doc.name;
                      entry.oasis_items = m_name;
                      entry.questions = m_questions;
                      entry.clinical = values.first_clinical;
                      entry.redroad_response = values.second_redroad;
                      entry.reason_for_change = values.reason_description;
                      frm.refresh_field('oasis_item');
                      d.hide();
                      valuesAdded = true; // Set the flag to indicate values are added
                      combined_mitems(frm);
                    }
                  });
                }
            })
            d.show();

            setTimeout(()=>{
              show_tooltip()},900
            )

          }

          // MULTIPLE PICKLIST VALUES
          else if(item_doc.picklist == "Multiple Pick-List")
          {
            var alertEnabled = true;             
            let d = new frappe.ui.Dialog({
              title: 'M Items',
              fields: [ 
                {
                  fieldtype: 'Data',				
                  fieldname: 'Mitems',
                  label: __("M Items"),
                  default : m_name,
                  read_only : "1",                   
                },
                {
                  fieldtype: 'Data',				
                  fieldname: 'questions',
                  label: __("Question"),
                  default : m_questions,
                  read_only : "1",                    
                },               
                   
                {
                  fieldtype: 'MultiSelectPills',				
                  fieldname: 'first',
                  label: __("Clinician Response"),
                  reqd: true,
                  options: multiple_sec_sub_type_list,
                  onload: function() {
                    // Initialize the available options based on the current selected values
                    const selectedValues = this.value || [];
                    const updatedOptions = this.df.options.filter(option => !selectedValues.includes(option));
                    this.df.options = updatedOptions;
                    this.refresh();
                  },
                  onchange: function(e) {
                    const selectedValues = this.value;        
                    const updatedOptions = this.df.options.filter(option => !selectedValues.includes(option));          
                    multiple_sec_sub_type_list = updatedOptions;
                    this.refresh();                    

                    
                    var dialog_options = ["7. None of the above behaviours demonstrated.","0-None; no charge for current services","UK-Unknown","3-None of the above","4-None of the above","10-None of the above"]

                    if (dialog_options.includes(this.value[0])){
                      var field =d.get_field("first");
                      field._data = []
                    }
                    else{

                        if(selectedValues.some(element => dialog_options.includes(element))){                                             
                          var field =d.get_field("first");
                          field.set_value([]);
                          frappe.show_alert({
                                      message:__('You cannot select this option'),
                                      indicator:'red'
                                    },6)  
                        }
                        else{
                          var field =d.get_field("first");
                          field._data = multiple_sec_sub_type_list
                        }
                    }
            
                    value_on_vice_versa(d);
                              

                  }             
                },


                {
                  fieldtype: 'MultiSelectPills',				
                  fieldname: 'second',
                  label: __("Redroad Coder Response"),
                  reqd: true,
                  options:multiple_sec_sub_type_list,                    
                  onload: function() {
                    // Initialize the available options based on the current selected values
                    const selectedValues = this.value || [];
                    const updatedOptions = this.df.options.filter(option => !selectedValues.includes(option));
                    this.df.options = updatedOptions;
                    this.refresh();
                  },
                  onchange: function(e) {
                    const selectedValues = this.value;        
                    const updatedOptions = this.df.options.filter(option => !selectedValues.includes(option));          
                    multiple_sec_sub_type_list = updatedOptions;
                    this.refresh();
                    
                                          
                    
                    
                    // you have to pass options here 
                    var dialog_options = ["7. None of the above behaviours demonstrated.","0-None; no charge for current services","UK-Unknown","3-None of the above","4-None of the above","10-None of the above"]

                    if (dialog_options.includes(this.value[0])){
                      var field =d.get_field("second");
                      field._data = []
                    }
                    else{

                        if(selectedValues.some(element => dialog_options.includes(element))){                                             
                          var field =d.get_field("second");
                          field.set_value([]);
                          frappe.show_alert({
                                      message:__('You cannot select this option'),
                                      indicator:'red'
                                    },6)  
                        }
                        else{
                          var field =d.get_field("second");
                          field._data = multiple_sec_sub_type_list
                        }
                    }
                    value_on_vice_versa(d)
                  }                      
                },


                {
                  label: __("Reason for change"),
                  fieldtype: 'Small Text',
                  fieldname: 'reason_description',
                  reqd: true, 
                },

                     
      
              ],
              primary_action_label: 'Submit',
              primary_action(values) 
              {     

                let valuesAdded = false;
                $('.standard-actions').on('click', function () {
                  if ($(this).css('display') === 'none') {
                    frappe.msgprint({
                      title: __('Message'),
                      indicator: 'orange',
                      message: 'Responses cannot be same',
                    });
                    valuesAdded = true;
                  } else if (!valuesAdded) {
                    // Values have not been added yet, so add them
                    let entry = frm.add_child("oasis_item");

                    entry.naming_oasis = item_doc.name;
  
                    entry.oasis_items =m_name;
                    entry.questions = m_questions;
        
                    entry.clinical = values.first.join('\n');
                    entry.redroad_response =values.second.join('\n');
  
                    entry.reason_for_change = values.reason_description;      
                    frm.refresh_field('oasis_item');            
                  
                    d.hide();  
                    valuesAdded = true; // Set the flag to indicate values are added
                    combined_mitems(frm);
                  }
                });
              }              
              
            });
          
          d.show();
        
        }

        // DATE PICKER  VALUES
        else if(item_doc.picklist == "DatePicker")
        {                    
          var alertEnabled = true; 
            let d = new frappe.ui.Dialog({
              title: 'M Items',
              fields: [ 
                {
                  fieldtype: 'Data',				
                  fieldname: 'Mitems',
                  label: __("M Items"),
                  default : m_name,
                  read_only : "1",                   
                },
                {
                  fieldtype: 'Data',				
                  fieldname: 'questions',
                  label: __("Question"),
                  default : m_questions,
                  read_only : "1",                    
                },               
                   
                   {
                    fieldtype: 'Date',				
                    fieldname: 'firstdate',
                    label: __("Clinician Response"),
                    reqd: true, 
                    onchange:function(e){                      
                      if(this.value > get_today()){              
                        frappe.show_alert(__(`You cannot select a future date`));                            
                        d.set_value("firstdate",null)                       
                      }
                      
                      same_date_validation(d)
                    }               
                  },        
      
                  {
                    fieldtype: 'Date',				
                    fieldname: 'seconddate',
                    label: __("Redroad Coder Response"),
                    reqd: true,
                    onchange:function(e){                        
                      if(this.value > get_today()){              
                        frappe.show_alert(__(`You cannot select a future date`));                            
                        d.set_value("seconddate",null)                       
                      }
                      same_date_validation(d)
                      
                    }       
                     
                  },

                  {
                    label: __("Reason for change"),
                    fieldtype: 'Small Text',
                    fieldname: 'reason_description',
                    reqd: true, 
                  },

                       
      
                ],
              primary_action_label: 'Submit',
              primary_action(values) 
              {     

                let valuesAdded = false;
                $('.standard-actions').on('click', function () {
                  if ($(this).css('display') === 'none') {
                    frappe.msgprint({
                      title: __('Message'),
                      indicator: 'orange',
                      message: 'Responses cannot be same',
                    });
                    valuesAdded = true;
                  } else if (!valuesAdded) {
                    // Values have not been added yet, so add them
                    var date1 = values.firstdate 
                    const firstdate = date1.split("-").reverse().join("-");

                    var date2 = values.seconddate 
                    const seconddate = date2.split("-").reverse().join("-");

                    let entry = frm.add_child("oasis_item");

                    
                    entry.naming_oasis = item_doc.name;

                    entry.oasis_items =m_name;
                    entry.questions = m_questions;
        
                    entry.clinical = firstdate;
                    entry.redroad_response = seconddate;

                    entry.reason_for_change = values.reason_description;
                  

                    frm.refresh_field('oasis_item');
                  
                    d.hide();
                    valuesAdded = true; // Set the flag to indicate values are added
                    combined_mitems(frm);
                  }
                });
              },          
              
          });
          
          d.show();
        
        }

         // THERPAY NEEDED  VALUES

        else if(m_name == "M2200")
        {
               
          

          let d = new frappe.ui.Dialog({
            title: 'M Items',
            fields: 
            [
            {
              fieldtype: 'Data',				
              fieldname: 'M Items',
              label: __("M Items"),
              default : m_name,
              read_only : "1",                   
            },
            {
              fieldtype: 'Data',				
              fieldname: 'questions',
              label: __("Question"),
              default : m_questions,
              read_only : "1",                    
            },                
            
            {
              fieldtype: 'Data',				
              fieldname: 'firstText',
              label: __("Clinician Response"),
              reqd: true, 
              onchange:function(e){
                single_picklist_value_M2200(d)     
              }                  
            },        

            {
              fieldtype: 'Data',				
              fieldname: 'secondText',
              label: __("Redroad Coder Response"),
              reqd: true,   
              onchange:function(e){
                single_picklist_value_M2200(d)                        
              }                                
            },


            {
              label: __("Reason for change"),
              fieldtype: 'Small Text',
              fieldname: 'reason_description',
              reqd: true, 
            },

            ],
            primary_action_label: 'Submit',
            primary_action(values) 
            {
              let valuesAdded = false;
              $('.standard-actions').on('click', function () {
                if ($(this).css('display') === 'none') {
                  frappe.msgprint({
                    title: __('Message'),
                    indicator: 'orange',
                    message: 'Responses cannot be same',
                  });
                  valuesAdded = true;
                } else if (!valuesAdded) {
                  // Values have not been added yet, so add them
                  let entry = frm.add_child("oasis_item");

                  entry.naming_oasis = item_doc.name;
                  entry.oasis_items =m_name;
                  entry.questions = m_questions;
      
                  entry.clinical = values.firstText;
                  entry.redroad_response = values.secondText;
                  entry.reason_for_change = values.reason_description;
                                
                  frm.refresh_field('oasis_item');              
                  d.hide();
                  valuesAdded = true; // Set the flag to indicate values are added
                  combined_mitems(frm);
                }
              });
                     
            }          
            
          });          
          d.show();
        
        }   
        
    });     
}
});


frappe.ui.form.on("Medical Coder Flow","qa_mitems",function(frm)
{

if (frm.doc.qa_mitems)  
{
  const item_name = frm.doc.qa_mitems
  
  let row = null;
  row = frm.doc.oasis_item.filter((item)=> item.naming_oasis === item_name) 


  if(row.length != 0){
    var oasis_items= row[0].oasis_items
    var clinical = row[0].clinical.split("<br>").join(",");
    var redroad_response = row[0].redroad_response.split("<br>").join(",");
    var reason_for_change = row[0].reason_for_change
    var reason_for_change = row[0].reason_for_change;
    var optional_details = row[0].optional_details;
  }else{     
    var clinical = "No Data";
    var redroad_response = "No Data";
    var reason_for_change = "No Data";
    var optional_details = "No Data"
  }


  
  
  frappe.model.with_doc('MItem Values', item_name, function () 
    {        
      
      const item_doc = frappe.model.get_doc('MItem Values', item_name);
      
      frm.set_value("qa_mitems",'');      
      
             
      var questions_name = item_doc.questions;
      const clinical_response = item_doc.sub_values

      var sub_type_list = [];
      for (var x = 0; x < clinical_response.length; x++) {
        sub_type_list[x] = clinical_response[x]['sub_values'];						
      }

      const second_response = item_doc.multiple

      var multiple_sec_sub_type_list = [];
      for (var x = 0; x < second_response.length; x++) {
        multiple_sec_sub_type_list[x] = second_response[x]['multiple_values'];						
      }

      let qa_curr_mitem = null;
      qa_curr_mitem = frm.doc.qa_table.filter((item)=> item.qa_mitem ===  item_doc.mitems) 

      if(qa_curr_mitem.length != 0){
        var oasis_items= qa_curr_mitem[0].qa_mitem
        frappe.msgprint({
          title: __('Warning'),
          indicator: 'orange',
          message: __(`Same Mitem <b>${oasis_items}</b> Number Already Exists`)
        });
       
      }

      else if(item_doc.picklist == "SinglePicklist"  )
      {

        var alertEnabled = true;
        let d =  new frappe.ui.Dialog
        ({ 
            title: 'MItems',
            fields: 
              [ 
                {
                fieldtype: 'Data',				
                fieldname: 'questions',
                label: __("Question"),
                default : item_doc.questions,
                read_only : "1",                    
                },
                {
                  fieldtype: 'Data',				
                  fieldname: 'M Items',
                  label: __("Answer 1:Clinician Response"),
                  default : clinical,
                  read_only : "1",                   
                },

                {
                  fieldtype: 'Data',				
                  fieldname: 'M Items',
                  label: __("Answer 2:Redroad Coder Response"),
                  default : redroad_response,
                  read_only : "1",                   
                },

                
                
                {
                  fieldtype: 'Select',				
                  fieldname: 'first_clinical',
                  label: __("Answer 3:Redroad QA Response"),
                  options : sub_type_list,  
                  reqd : 1,             
                  onchange:function(e){

                    if(redroad_response === this.value){
                      
                      if(alertEnabled){
                        frappe.show_alert(__(`you can't select the same option <b>${this.value}</b>`));
                        d.standard_actions.hide()
                      };	
                      alertEnabled = false;
                      
                    }
                    else{
                      alertEnabled = true;
                      d.standard_actions.show()
                    }
                  }
                                    
                },

                {
                  fieldtype: 'Small Text',				
                  fieldname: 'second_redroad',
                  label: __("Answer 4:QA Rationale"),
                  reqd: true, 
                                      
                },                   

              ],

              primary_action_label: 'Submit',
              primary_action(values) 
              {     

                let valuesAdded = false;
                $('.standard-actions').on('click', function () {
                  if ($(this).css('display') === 'none') {
                    frappe.msgprint({
                      title: __('Message'),
                      indicator: 'orange',
                      message: 'Responses cannot be same',
                    });
                    valuesAdded = true;
                  } else if (!valuesAdded) {
                    // Values have not been added yet, so add them
                    if(item_name)
                    {
                                          
                    let entry = frm.add_child("qa_table");
                      entry.qa_mitem = item_doc.mitems;
                      entry.questions = item_doc.questions;
  
                      entry.red_road_qa_response = values.first_clinical;
                      entry.qa_rationale = values.second_redroad;
  
                    frm.refresh_field('qa_table');
                    
                    combined_mitems(frm);
                    }
                    d.hide();
                    valuesAdded = true;
                  }
                });
              }
            }); 
         d.show();
         setTimeout(()=>{
          show_tooltip()},900
          )
         
      }

     
      else if(item_doc.picklist == "Multiple Pick-List")
      {          
        let d = new frappe.ui.Dialog({
          title: 'MItems',
          fields: [
            {
              fieldtype: 'Data',				
              fieldname: 'questions',
              label: __("Question"),
              default : item_doc.questions,
              read_only : "1",                    
              },
            {
              fieldtype: 'Data',				
              fieldname: 'M Items',
              label: __("Answer 1:Clinical Response"),
              default : clinical,
              read_only : "1",                   
            },

            {
              fieldtype: 'Data',				
              fieldname: 'M Items',
              label: __("Answer 2:Redroad Coder Response"),
              default : redroad_response,
              read_only : "1",                   
            },

            
            {
              fieldtype: 'MultiSelectPills',				
              fieldname: 'first_clinical',
              // label: __("QA Clinician Response"),

              label: __("Answer 3:Redroad QA Response"),

              reqd: true,
              options:multiple_sec_sub_type_list,
              onload: function() {
                // Initialize the available options based on the current selected values
                const selectedValues = this.value || [];
                const updatedOptions = this.df.options.filter(option => !selectedValues.includes(option));
                this.df.options = updatedOptions;
                this.refresh();
              },
              onchange: function(e) {
                const selectedValues = this.value;                        
                const updatedOptions = this.df.options.filter(option => !selectedValues.includes(option));          
                multiple_sec_sub_type_list = updatedOptions;
                this.refresh();                  
                
                var sortedFieldArray = Array.isArray(this.value) ? this.value.map(value => value.trim()).sort() : this.value.split(',').map(value => value.trim()).sort();
                var sortedSecondArray = d.fields[3].default.split('\n').sort()
                
                var valuesNotInOptions = Array.isArray(this.value) ? this.value.filter(element => !d.fields[4].options.includes(element)) : [];
                
                valuesNotInOptions.length > 0
                  ? (
                    frappe.show_alert({
                      title: __('Warning'),
                      message: __("Value is not present in the list."),
                      indicator: 'orange'
                    }, 2),
                    d.standard_actions.hide()
                  )
                  : JSON.stringify(sortedFieldArray) !== JSON.stringify(sortedSecondArray)
                    ? d.standard_actions.show()
                    : (
                      frappe.show_alert({
                        title: __('Warning'),
                        message: __("You can't select the same option."),
                        indicator: 'orange'
                      }, 2),
                      d.standard_actions.hide()
                    );

                var dialog_options = ["7. None of the above behaviours demonstrated.","0-None; no charge for current services","UK-Unknown","3-None of the above","4-None of the above","10-None of the above"]

                if (dialog_options.includes(this.value[0])){
                  var field =d.get_field("first_clinical");
                  field._data = []
                }
                else{
                  if(selectedValues.some(element => dialog_options.includes(element))){                                             
                    var field =d.get_field("first_clinical");
                    field.set_value([]);
                    frappe.show_alert({
                                message:__('You cannot select this option'),
                                indicator:'red'
                              },6)  
                  }
                  else{
                    var field =d.get_field("first_clinical");
                    field._data = multiple_sec_sub_type_list
                  }
                }                       
              }
                                          
            },

            {
              fieldtype: 'Small Text',				
              fieldname: 'second_redroad',
              label: __("Answer 4:QA Rationale"),
              reqd: true, 
                                  
            },    
  
          ],
          primary_action_label: 'Submit',
          primary_action(values) 
          {     

            let valuesAdded = false;
            $('.standard-actions').on('click', function () {
              if ($(this).css('display') === 'none') {
                frappe.msgprint({
                  title: __('Message'),
                  indicator: 'orange',
                  message: 'Responses cannot be same',
                });
                valuesAdded = true;
              } else if (!valuesAdded) {
                // Values have not been added yet, so add them
                let entry = frm.add_child("qa_table");
                entry.qa_mitem = item_doc.mitems;
                entry.questions = questions_name;    
                entry.red_road_qa_response = values.first_clinical.join('\n');
                entry.qa_rationale = values.second_redroad;             
                frm.refresh_field('qa_table');  
                d.hide(); 
                valuesAdded = true; // Set the flag to indicate values are added
                combined_mitems(frm);
              }
            });
          }           
        });
      
      d.show();
    
    }

    // DATE PICKER  VALUES
    else if(item_doc.picklist == "DatePicker")
    {    
      

      var alertEnabled = true;
      let d = new frappe.ui.Dialog({
          title: 'MItems',
          fields: [  
            {
              fieldtype: 'Data',				
              fieldname: 'questions',
              label: __("Question"),
              default : item_doc.questions,
              read_only : "1",                    
              },
            {
              fieldtype: 'Data',				
              fieldname: 'M Items',
              label: __("Answer 1:Clinical Response"),
              default : clinical,
              read_only : "1",                   
            },

            {
              fieldtype: 'Data',				
              fieldname: 'M Items',
              label: __("Answer 2:Redroad Coder Response"),
              default : redroad_response,
              read_only : "1",                   
            },   
            {
              fieldtype: 'Date',				
              fieldname: 'first_clinical',                
              label: __("Answer 3:Redroad QA Response"),
              reqd: true,    
              onchange:function(e){                  
                $(".input-with-feedback.form-control.bold" ).datepicker({  maxDate: new Date() });

                if(this.value > get_today()){
                  frappe.show_alert(__(`You cannot select a future date`));
                  d.set_value("first_clinical",null)
                }

                
                if(redroad_response === this.value.split("-").reverse().join("-")){
                  
                  if(alertEnabled){
                    frappe.show_alert(__(`you can't select the same option <b>${redroad_response}</b>`));
                    d.standard_actions.hide()
                  };	
                  alertEnabled = false;
                  
                }
                else{
                  alertEnabled = true;
                  d.standard_actions.show()
                }
              }                           
            },
            {
              fieldtype: 'Small Text',				
              fieldname: 'second_redroad',
              label: __("Answer 4:QA Rationale"),
              reqd: true,                                    
            },    
          ],
          primary_action_label: 'Submit',
          primary_action(values) 
          {     

            let valuesAdded = false;
            $('.standard-actions').on('click', function () {
              if ($(this).css('display') === 'none') {
                frappe.msgprint({
                  title: __('Message'),
                  indicator: 'orange',
                  message: 'Responses cannot be same',
                });
                valuesAdded = true;
              } else if (!valuesAdded) {
                // Values have not been added yet, so add them
                var date = values.first_clinical 
                const first_clinical = date.split("-").reverse().join("-");
  
                let entry = frm.add_child("qa_table");
                entry.qa_mitem = item_doc.mitems;
                entry.questions = questions_name;    
                entry.red_road_qa_response = first_clinical;
                entry.qa_rationale = values.second_redroad;
                frm.refresh_field('qa_table');                           
                d.hide();
                valuesAdded = true; // Set the flag to indicate values are added
                combined_mitems(frm);
              }
            });
          }           
      });        
      d.show();      
    }
    // THERPAY NEEDED  VALUES

    else if(item_doc.mitems == "M2200")
    {
      
      var regex = /[^0-9]/g;    
      var alertEnabled = true;
      let d = new frappe.ui.Dialog({
        title: 'MItems',
        fields: [
          {
            fieldtype: 'Data',				
            fieldname: 'questions',
            label: __("Question"),
            default : item_doc.questions,
            read_only : "1",                    
            },
          {
            fieldtype: 'Data',				
            fieldname: 'M Items',
            label: __("Answer 1:Clinical Response"),
            default : clinical,
            read_only : "1",                   
          },

          {
            fieldtype: 'Data',				
            fieldname: 'M Items',
            label: __("Answer 2:Redroad Coder Response"),
            default : redroad_response,
            read_only : "1",                   
          },

          
          {
            fieldtype: 'Data',				
            fieldname: 'first_clinical',
            label: __("Answer 3:Redroad QA Response"),
            reqd: true, 
            onchange:function(e){
              single_picklist_value_M2200(d)           
            }                    
          },
          {
            fieldtype: 'Small Text',				
            fieldname: 'second_redroad',
            label: __("Answer 4:QA Rationale"),
            reqd: true, 
                                
          },

        ],
        primary_action_label: 'Submit',
        primary_action(values) 
        {     

          let valuesAdded = false;
          $('.standard-actions').on('click', function () {
            if ($(this).css('display') === 'none') {
              frappe.msgprint({
                title: __('Message'),
                indicator: 'orange',
                message: 'Responses cannot be same',
              });
              valuesAdded = true;
            } else if (!valuesAdded) {
              // Values have not been added yet, so add them
              let entry = frm.add_child("qa_table");
              entry.qa_mitem = item_doc.mitems;
              entry.questions = questions_name;
              entry.red_road_qa_response = values.first_clinical;
              entry.qa_rationale = values.second_redroad;         
              frm.refresh_field('qa_table');  

              d.hide();
              valuesAdded = true; // Set the flag to indicate values are added
              combined_mitems(frm);
            }
          });
        }          
        
      });          
      d.show();      
    }   
  })   
}
});

//Filter the QA Name 

// -------------------Read only Fields code -------------------------------//


frappe.ui.form.on("Medical Coder Flow",{

refresh:function(frm){

  make_fields_readonly_for_super_users(frm)
  

  frm.toggle_enable(["icd_code","chart_status","audit_type","email","employee","assign_to_name","branch","qa_mitem","mitem","patient_reference_details","team_lead"],0)   

  // if (!frappe.user_roles.includes('Medical Coder')){
  //   frm.set_df_property("oasis_item", "read_only", 1);
  // }

  //L1 Supervisor    
  if(frappe.user_roles.includes('Production TL') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin'))
  {
    if(['Send to Medical Coder - Answer 1','Send to Medical Coder - Answer 2','Send to Medical Coder - Answer 3'].includes(frm.doc.workflow_state) ){
      frm.set_df_property("hold_reason", "read_only", 1);
    }
    if(!['Clarification Required- Query 1','Clarification Required- Query 2','Clarification Required- Query 3',
  'Coder 1st Level Appeal','QA Error Rejected  by QA TL'].includes(frm.doc.workflow_state) ){
      frm.set_df_property("import_file", "read_only", 1);
    }

    if(frm.doc.workflow_state == "Clarification Required- Query 2" || frm.doc.workflow_state == "Clarification Required- Query 3"  || frm.doc.workflow_state == "Clarification Required- Query 1"){
      frm.toggle_display(['pdpc_qa', 'pdx_qa','no_of_pages_qa', 'icd_codeqa','qa_icd_comments','qa_mitems_section'], 0);
    }
    if(frm.doc.workflow_state != "Clarification Required- Query 1")
    {
      frm.set_df_property("coding_post_problem_amswer_comments", "read_only", 1);
    }
    if(frm.doc.workflow_state != "Clarification Required- Query 2")
    {
      frm.set_df_property("cppa", "read_only", 1);
    }
    if(frm.doc.workflow_state != "Clarification Required- Query 3")
    {
      frm.set_df_property("cppa1", "read_only", 1);
    }
    if(frm.doc.workflow_state != "Coder 1st Level Appeal")
    {
      frm.set_df_property("accept_coder_error_from_coder", "read_only", 1);
      frm.set_df_property("team_lead_comments", "read_only", 1);  
    }
    if(frm.doc.workflow_state != "QA Error Rejected  by QA TL")
    {
      frm.set_df_property("accept_coder_error_from_qa_lead", "read_only", 1);
      frm.set_df_property("team_lead_comments_by_qal_feedback", "read_only", 1);
    }

    if(frm.doc.workflow_state == "Picked for Audit" || frm.doc.workflow_state == "Pending Quality") {
      
      frm.toggle_display(['pdpc_qa', 'pdx_qa','no_of_pages_qa','icd_codeqa','qa_icd_comments','pdpc_qa_comments','no_of_pages_qa_comments','pdx_qa_comments','qa_mitems_section','section_break_121','hold_reason'], 0);
      $(".form-column.col-sm-4").eq(1).hide();
      $(".form-column.col-sm-4").eq(2).hide();
      $(".form-column.col-sm-4").eq(4).hide();
      $(".form-column.col-sm-4").eq(5).hide(); 
      $('.control-label:contains("QA Feedback")').hide();
    }

    // Hold Reason is showing in different WorkFlow State 
    if(['Draft',
        'Error Marked By QA',
        'Coder 2nd Level Appeal',
        'Operations Manager Review - 2nd Level Appeal',
        'Coder Error Rejected by L2 Supervisor - 2nd Level Appeal',
        'QA Manager Review - Coder Error Rejected by L2 Supervisor - 2nd Level Appeal',
        'QA Error Rejected by QA Manager',
        'Department Head Review - QA Error Rejected by QA Manager',
        'Coder Error Accepted by Department Head',
        'Operations Manager Review - Coder Error Rejected  by L1 supervisor',
        'Coder Error Rejected  by L2 supervisor - 1st Level Appeal',
        'QA Manager Review - Coder Error Rejected  by L2 supervisor - 1st Level Appeal',
        'Coder Error Rejected by Department Head',
        'QA Error Accepted by QA Manager',
        'QA Error Accepted by QA TL',
        'QA Appeal',
        'QA Manager Review - QA Appeal',
        'Coder Error Accepted  by L2 supervisor - 1st Level Appeal',
        'Coder Error Accepted by L2 Supervisor - 2nd Level Appeal'].includes(frm.doc.workflow_state)){
      frm.set_df_property('hold_reason','read_only',1);
    }

    if (!["Coder Error Accepted by Department Head","Coder Error Accepted  by L2 supervisor - 1st Level Appeal","Coder Error Accepted by L2 Supervisor - 2nd Level Appeal"].includes(frm.doc.workflow_state)){
      frm.set_df_property("coder_error_comments", "read_only", 1);
    }      
  }

  // Medical Coder
  if( frappe.user_roles.includes('Medical Coder') && frappe.session.user != "Administrator"  && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
    var fieldListMC = ["Pending Quality",
                        "Picked for Audit",
                        "No Error",
                        "Error Corrected by QA",
                        "Coder Error Rejected by L1 supervisor - 1st Level Appeal",
                        "QA Error Accepted by QA TL",
                        "QA Error Rejected  by QA TL",
                        "QA Appeal","QA Manager Review - QA Appeal",
                        "QA Manager Review - Coder Error Rejected  by L2 supervisor - 1st Level Appeal",
                        "QA Manager Review - Coder Error Rejected by L2 Supervisor - 2nd Level Appeal",
                        "Department Head Review - QA Error Rejected by QA Manager",
                        "QA Error Accepted by QA Manager",
                        "QA Error Rejected by QA Manager",
                        "Coder Error Rejected by Department Head",
                        "Coder Error Rejected  by L1 supervisor-Post QA TL Feedback",
                        "Operations Manager Review - Coder Error Rejected  by L1 supervisor",
                        "Coder Error Rejected  by L2 supervisor - 1st Level Appeal",
                        "Operations Manager Review - 2nd Level Appeal",
                        "Coder Error Rejected by L2 Supervisor - 2nd Level Appeal",
                        "QA Error Accept by QA Manager",
                        "Chart Locked",
                        "Coder 1st Level Appeal"
                      ]

    if(fieldListMC.includes(frm.doc.workflow_state)){

      frm.set_df_property("accept_error_two","read_only",1);
      frm.set_df_property("medical_coder_comments_two","read_only",1);

      frm.set_df_property("coder_accept_error_from_qa","read_only",1);
      frm.set_df_property("medical_coder_comments","read_only",1);

      // frm.set_df_property("coder_accept_error_from_qa")

      frm.set_df_property("pdx", "read_only", 1);
      frm.set_df_property("pdpc", "read_only", 1);
      frm.set_df_property("no_of_pages", "read_only", 1);

      frm.set_df_property("type", "read_only", 1);
      frm.set_df_property("icd", "read_only", 1);
      frm.set_df_property("onsetexacerbation", "read_only", 1);
      frm.set_df_property("symptom_control_rating", "read_only", 1);
      // frm.set_df_property("icd_code", "read_only", 1);

      frm.set_df_property("oasis_answer_change", "read_only", 1);


      frm.set_df_property("sticky_notes_table", "read_only", 1);
      frm.set_df_property("mitems", "read_only", 1);
      frm.set_df_property("oasis_item", "read_only", 1);

      frm.set_df_property("coding_post_problem", "read_only", 1);
      frm.set_df_property("clinician_name", "read_only", 1);
      frm.set_df_property("question", "read_only", 1);
      frm.set_df_property("question1", "read_only", 1); 
      frm.set_df_property("question2", "read_only", 1);

      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)

      // frm.set_df_property("cko", "read_only", 1);
      frm.set_df_property("mitem", "read_only", 1);
      frm.set_df_property("cancer_treatments", "read_only", 1);
      frm.set_df_property("rt_mitems", "read_only", 1);
      frm.set_df_property("other", "read_only", 1);
      frm.set_df_property("ct_mitems", "read_only", 1);
      frm.set_df_property("respiratory_therapies", "read_only", 1);
      frm.set_df_property("none_mitems", "read_only", 1);
      frm.set_df_property("none_of_the_above", "read_only", 1);
      frm.set_df_property("ot_mitems", "read_only", 1);

      frm.set_df_property("accept_error_two","read_only",1);
      frm.set_df_property("medical_coder_comments_two","read_only",1);

      frm.set_df_property("coder_accept_error_from_qa","read_only",1);
      frm.set_df_property("medical_coder_comments","read_only",1);
      frm.set_df_property("hold_reason","read_only",1);
      frm.set_df_property("import_file","read_only",1);
      frm.toggle_display("notepad", 0)

    }

    if(!["Draft", "Send to Medical Coder - Answer 1","Send to Medical Coder - Answer 2","Send to Medical Coder - Answer 3"].includes(frm.doc.workflow_state))
    {
      frm.set_df_property("assessment_date","read_only",1); 
      frm.set_df_property("gender","read_only",1); 
    }

    // to make the question and comment fields readonly when the workflow state not in "Coder Error Accepted  by L1 supervisor - 1st Level Appeal"
    if(frm.doc.workflow_state != "Coder Error Accepted  by L1 supervisor - 1st Level Appeal")
    {
      frm.set_df_property("medical_coder_comment3", "read_only", 1);
      frm.set_df_property("error_based_on_feedback_received2", "read_only", 1);
    }

    if(frm.doc.workflow_state == "Picked for Audit" || frm.doc.workflow_state == "Pending Quality") {
      frm.toggle_display(['pdpc_qa', 'pdx_qa','no_of_pages_qa','icd_codeqa','qa_icd_comments','pdpc_qa_comments','no_of_pages_qa_comments','pdx_qa_comments','qa_mitems_section','section_break_121'], 0);
      $(".form-column.col-sm-4").eq(1).hide();
      $(".form-column.col-sm-4").eq(2).hide();
      $(".form-column.col-sm-4").eq(4).hide();
      $(".form-column.col-sm-4").eq(5).hide();
      $('.control-label:contains("QA Feedback")').hide();
    }

    if(frm.doc.workflow_state != "Error Marked By QA")
    {
      frm.set_df_property("medical_coder_comments", "read_only", 1); 
    }
    if(frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal" && frm.doc.error_based_on_feedback_received2 == "Yes")
    {
      if(frm.doc.mc_tick_3){
        frm.set_df_property("hold_reason",'read_only',1);
      } 
    }

    if(frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal" && frm.doc.error_based_on_feedback_received2 == "No")
    {
      if(frm.doc.mc_tick_3){
        frm.set_df_property("hold_reason",'read_only',1);
      }     
      frm.toggle_display("notepad", 0)
      frm.set_df_property("pdpc", "read_only", 1);
      frm.set_df_property("pdx", "read_only", 1);
      frm.set_df_property("no_of_pages", "read_only", 1);

      frm.set_df_property("type", "read_only", 1);
      frm.set_df_property("icd", "read_only", 1);
      frm.set_df_property("onsetexacerbation", "read_only", 1);
      frm.set_df_property("symptom_control_rating", "read_only", 1);
    frm.set_df_property("icd_code", "read_only", 1);

      frm.set_df_property("oasis_answer_change", "read_only", 1);


      frm.set_df_property("sticky_notes_table", "read_only", 1);
      frm.set_df_property("mitems", "read_only", 1);
      frm.set_df_property("oasis_item", "read_only", 1);

      frm.set_df_property("error_marked", "read_only", 1);
      frm.set_df_property("qa_comments", "read_only", 1);
      
      frm.set_df_property("coding_post_problem", "read_only", 1);

      frm.set_df_property("clinician_name", "read_only", 1);
      frm.set_df_property("question", "read_only", 1);
      frm.set_df_property("question1", "read_only", 1); 
      frm.set_df_property("question2", "read_only", 1);

      frm.set_df_property("coder_accept_error_from_qa", "read_only", 1);
      frm.set_df_property("medical_coder_comments", "read_only", 1);

      frm.refresh_field("workflow_state");

      // frm.set_df_property("cko", "read_only", 1);
      frm.set_df_property("mitem", "read_only", 1);
      frm.set_df_property("cancer_treatments", "read_only", 1);
      frm.set_df_property("rt_mitems", "read_only", 1);
      frm.set_df_property("other", "read_only", 1);
      frm.set_df_property("ct_mitems", "read_only", 1);
      frm.set_df_property("respiratory_therapies", "read_only", 1);
      frm.set_df_property("none_mitems", "read_only", 1);
      frm.set_df_property("none_of_the_above", "read_only", 1);
      frm.set_df_property("ot_mitems", "read_only", 1);

      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)
    }

  
    if(frm.doc.chart_status == "Production Completed")
    {

      frm.toggle_display(['pdpc_qa', 'pdx_qa','no_of_pages_qa','icd_codeqa','qa_icd_comments'], 0);
      frm.set_df_property("pdx", "read_only", 1);
      frm.set_df_property("pdpc", "read_only", 1);
      frm.set_df_property("no_of_pages", "read_only", 1);
      frm.set_df_property("hold_reason","read_only",1);
      frm.set_df_property("assessment_date", "read_only",1);
      frm.set_df_property("gender", "read_only",1);
      frm.toggle_display("notepad", 0)



      frm.set_df_property("type", "read_only", 1);
      frm.set_df_property("icd", "read_only", 1);
      frm.set_df_property("onsetexacerbation", "read_only", 1);
      frm.set_df_property("symptom_control_rating", "read_only", 1);
      // frm.set_df_property("icd_code", "read_only", 1);

      frm.set_df_property("oasis_answer_change", "read_only", 1);


      frm.set_df_property("sticky_notes_table", "read_only", 1);
      frm.set_df_property("mitems", "read_only", 1);
      frm.set_df_property("oasis_item", "read_only", 1);
      // frm.set_df_property("cko", "read_only", 1);
      frm.set_df_property("mitem", "read_only", 1);
      frm.set_df_property("cancer_treatments", "read_only", 1);
      frm.set_df_property("rt_mitems", "read_only", 1);
      frm.set_df_property("other", "read_only", 1);
      frm.set_df_property("ct_mitems", "read_only", 1);
      frm.set_df_property("respiratory_therapies", "read_only", 1);
      frm.set_df_property("none_mitems", "read_only", 1);
      frm.set_df_property("none_of_the_above", "read_only", 1);
      frm.set_df_property("ot_mitems", "read_only", 1);


      // frm.set_df_property("error_marked", "read_only", 1);
      // frm.set_df_property("qa_comments", "read_only", 1);
      
      frm.set_df_property("coding_post_problem", "read_only", 1);

      frm.set_df_property("clinician_name", "read_only", 1);
      frm.set_df_property("question", "read_only", 1);
      frm.set_df_property("question1", "read_only", 1); 
      frm.set_df_property("question2", "read_only", 1);

      frm.set_df_property("icd_codeqa", "read_only", 1);
      
    }
    
    if(frm.doc.workflow_state != "Send to Medical Coder - Answer 1")
    {
      frm.set_df_property("question1", "read_only", 1); 
    }
    if(frm.doc.workflow_state != "Send to Medical Coder - Answer 2")
    {
      frm.set_df_property("question2", "read_only", 1); 
    }
    if(frm.doc.workflow_state == "Send to Medical Coder - Answer 2" || frm.doc.workflow_state == "Send to Medical Coder - Answer 3" || frm.doc.workflow_state == "Clarification Required- Query 1"){
      frm.toggle_display(['pdpc_qa', 'pdx_qa','no_of_pages_qa', 'icd_codeqa','qa_icd_comments','qa_mitems_section'], 0);
    }
    if(frm.doc.chart_status == "In-Progress"){
      frm.toggle_display("icd_codeqa")
    }
    if(frm.doc.chart_status == "Coder Error Accepted  by L2 supervisor - 1st Level Appeal"){
      frm.set_df_property("coder_accept_error_from_qa", "read_only", 1);
      frm.set_df_property("medical_coder_comments", "read_only", 1);
      frm.set_df_property("coding_post_problem", "read_only", 1);

      frm.set_df_property("clinician_name", "read_only", 1);
      frm.set_df_property("question", "read_only", 1);
      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)
    }

    if(frm.doc.workflow_state == "Draft"){  
      frm.set_df_property("question1", "read_only", 1); 
      frm.set_df_property("question2", "read_only", 1); 
      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)
      
      frm.toggle_display(['pdpc_qa', 'pdx_qa','no_of_pages_qa','icd_codeqa','qa_icd_comments','medical_coder_comments','medical_coder_comments_two','medical_coder_comments','medical_coder_comment3'], 0);
    }

    if(frm.doc.workflow_state == "Send to Medical Coder - Answer 1")
    {        
      frm.set_df_property("coding_post_problem", "read_only", 1); 
      frm.set_df_property("question", "read_only", 1); 
      frm.set_df_property("question2", "read_only", 1);
      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)
      frm.set_df_property("medical_coder_comments", "read_only", 1); 
      // frm.set_df_property("icd_code", "read_only", 1);
      
      frm.toggle_display(['pdpc_qa', 
                          'pdx_qa',
                          'no_of_pages_qa',
                          'icd_codeqa',
                          'qa_icd_comments'
                        ], 0);
    }

    if(frm.doc.workflow_state == "Send to Medical Coder - Answer 2"){        
      frm.set_df_property("coding_post_problem", "read_only", 1); 
      frm.set_df_property("question", "read_only", 1); 
      frm.set_df_property("question1", "read_only", 1);      
      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)  
      frm.set_df_property("medical_coder_comments", "read_only", 1); 
      // frm.set_df_property("icd_code", "read_only", 1);

    }

    if(frm.doc.workflow_state == "Send to Medical Coder - Answer 3"){        
      frm.set_df_property("coding_post_problem", "read_only", 1); 
      frm.set_df_property("clinician_name", "read_only", 1);
      frm.set_df_property("question", "read_only", 1); 
      frm.set_df_property("question1", "read_only", 1);   
      frm.set_df_property("question2", "read_only", 1);    
      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)
      frm.set_df_property("medical_coder_comments", "read_only", 1); 
      // frm.set_df_property("icd_code", "read_only", 1);

    }

    if(frm.doc.chart_status == "Error Corrected by Coder"){
      frm.set_df_property("coder_error_comments", "read_only", 1);
      frm.set_df_property("accept_error_two", "read_only", 1);
      frm.set_df_property("medical_coder_comments_two", "read_only", 1);
      frm.set_df_property("coder_accept_error_from_qa", "read_only", 1);
      frm.set_df_property("medical_coder_comments", "read_only", 1);

      frm.set_df_property("pdx", "read_only", 1);
      frm.set_df_property("pdpc", "read_only", 1);
      frm.set_df_property("no_of_pages", "read_only", 1);


      frm.set_df_property("type", "read_only", 1);
      frm.set_df_property("icd", "read_only", 1);
      frm.set_df_property("onsetexacerbation", "read_only", 1);
      frm.set_df_property("symptom_control_rating", "read_only", 1);
      // frm.set_df_property("icd_code", "read_only", 1);

      frm.set_df_property("oasis_answer_change", "read_only", 1);

      
      frm.set_df_property("sticky_notes_table", "read_only", 1);
      frm.set_df_property("mitems", "read_only", 1);
      frm.set_df_property("oasis_item", "read_only", 1);

      frm.set_df_property("error_marked", "read_only", 1);
      frm.set_df_property("qa_comments", "read_only", 1);
      
      frm.set_df_property("coding_post_problem", "read_only", 1);

      frm.set_df_property("clinician_name", "read_only", 1);
      frm.set_df_property("question", "read_only", 1);
      frm.set_df_property("question1", "read_only", 1); 
      frm.set_df_property("question2", "read_only", 1);

      // frm.set_df_property("cko", "read_only", 1);
      frm.set_df_property("mitem", "read_only", 1);
      frm.set_df_property("cancer_treatments", "read_only", 1);
      frm.set_df_property("rt_mitems", "read_only", 1);
      frm.set_df_property("other", "read_only", 1);
      frm.set_df_property("ct_mitems", "read_only", 1);
      frm.set_df_property("respiratory_therapies", "read_only", 1);
      frm.set_df_property("none_mitems", "read_only", 1);
      frm.set_df_property("none_of_the_above", "read_only", 1);
      frm.set_df_property("ot_mitems", "read_only", 1);

      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)
      frm.toggle_display("notepad", 0)
    }

    if(frm.doc.chart_status == "Error Marked By QA"){
     if(!frm.doc.__unsaved){
        frm.set_df_property("pdx", "read_only", 1);
        frm.set_df_property("pdpc", "read_only", 1);
        frm.set_df_property("no_of_pages", "read_only", 1);


        frm.set_df_property("type", "read_only", 1);
        frm.set_df_property("icd", "read_only", 1);
        frm.set_df_property("onsetexacerbation", "read_only", 1);
        frm.set_df_property("symptom_control_rating", "read_only", 1);
        // frm.set_df_property("icd_code", "read_only", 1);

        frm.set_df_property("oasis_answer_change", "read_only", 1);
        frm.set_df_property("sticky_notes_table", "read_only", 1);
        frm.set_df_property("mitems", "read_only", 1);
        frm.set_df_property("oasis_item", "read_only", 1);
        // frm.set_df_property("cko", "read_only", 1);
        frm.set_df_property("mitem", "read_only", 1);
        frm.set_df_property("cancer_treatments", "read_only", 1);
        frm.set_df_property("rt_mitems", "read_only", 1);
        frm.set_df_property("other", "read_only", 1);
        frm.set_df_property("ct_mitems", "read_only", 1);
        frm.set_df_property("respiratory_therapies", "read_only", 1);
        frm.set_df_property("none_mitems", "read_only", 1);
        frm.set_df_property("none_of_the_above", "read_only", 1);
        frm.set_df_property("ot_mitems", "read_only", 1);

        frm.toggle_display("notepad", 0)
        // frm.set_df_property("error_marked", "read_only", 1);
        // frm.set_df_property("qa_comments", "read_only", 1);
        
        frm.set_df_property("coding_post_problem", "read_only", 1);

        frm.set_df_property("clinician_name", "read_only", 1);
        frm.set_df_property("question", "read_only", 1);
        frm.set_df_property("question1", "read_only", 1); 
        frm.set_df_property("question2", "read_only", 1);

        frm.set_df_property("icd_codeqa", "read_only", 1);
        frm.set_df_property("qa_icd_comments","read_only",1)
     }
      
    }

    if(frm.doc.workflow_state != "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback"){
      frm.set_df_property("medical_coder_comments_two", "read_only", 1);
    }

    if (frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback" && frm.doc.accept_error_two && frm.doc.mc_tick_two){
      if(!frm.doc.__unsaved){
      var fields = ["ot_mitems",
                    "none_of_the_above",
                    "none_mitems",
                    "respiratory_therapies",
                    "ct_mitems",
                    "other",
                    "rt_mitems",
                    "cancer_treatments",
                    "oasis_item",
                    "mitems",
                    "pdx",
                    "pdpc",
                    "no_of_pages",
                    "type",
                    "icd",
                    "onsetexacerbation",
                    "symptom_control_rating",
                    "oasis_answer_change",
                    "sticky_notes_table",
                    "accept_error_two",
                    "mc_tick_two",
                    "medical_coder_comments_two",
                    "coding_post_problem",
                    "hold_reason"
                  ]

      fields.forEach((field)=>{
        frm.set_df_property(field, "read_only", 1);
      })
    }

    }
    else if(frm.doc.chart_status == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback" && frm.doc.accept_error_two == "No") 
    {
      
      frm.set_df_property("pdpc", "read_only", 1);
      frm.set_df_property("pdx", "read_only", 1);
      frm.set_df_property("no_of_pages", "read_only", 1);

      frm.set_df_property("type", "read_only", 1);
      frm.set_df_property("icd", "read_only", 1);
      frm.set_df_property("onsetexacerbation", "read_only", 1);
      frm.set_df_property("symptom_control_rating", "read_only", 1);
      // frm.set_df_property("icd_code", "read_only", 1);

      frm.set_df_property("oasis_answer_change", "read_only", 1);

      frm.toggle_display("notepad", 0)
      frm.set_df_property("sticky_notes_table", "read_only", 1);
      frm.set_df_property("mitems", "read_only", 1);
      frm.set_df_property("oasis_item", "read_only", 1);

      frm.set_df_property("error_marked", "read_only", 1);
      frm.set_df_property("qa_comments", "read_only", 1);
      
      frm.set_df_property("coding_post_problem", "read_only", 1);

      frm.set_df_property("clinician_name", "read_only", 1);
      frm.set_df_property("question", "read_only", 1);
      frm.set_df_property("question1", "read_only", 1); 
      frm.set_df_property("question2", "read_only", 1);

      frm.set_df_property("coder_accept_error_from_qa", "read_only", 1);
      frm.set_df_property("medical_coder_comments", "read_only", 1);

      frm.refresh_field("workflow_state");

      // frm.set_df_property("cko", "read_only", 1);
      frm.set_df_property("mitem", "read_only", 1);
      frm.set_df_property("cancer_treatments", "read_only", 1);
      frm.set_df_property("rt_mitems", "read_only", 1);
      frm.set_df_property("other", "read_only", 1);
      frm.set_df_property("ct_mitems", "read_only", 1);
      frm.set_df_property("respiratory_therapies", "read_only", 1);
      frm.set_df_property("none_mitems", "read_only", 1);
      frm.set_df_property("none_of_the_above", "read_only", 1);
      frm.set_df_property("ot_mitems", "read_only", 1);

      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)
    }

    if(frm.doc.error_based_on_feedback_received2 && frm.doc.mc_tick_3){
      if(!frm.doc.__unsaved && frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal" && frm.doc.chart_status == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal")
      {
        frm.toggle_enable(['error_based_on_feedback_received2', 'mc_tick_3','medical_coder_comment3'], 0);
        frm.set_df_property("pdx", "read_only", 1);
        frm.set_df_property("pdpc", "read_only", 1);
        frm.set_df_property("no_of_pages", "read_only", 1);

        frm.set_df_property("type", "read_only", 1);
        frm.set_df_property("icd", "read_only", 1);
        frm.set_df_property("onsetexacerbation", "read_only", 1);
        frm.set_df_property("symptom_control_rating", "read_only", 1);
        frm.toggle_display("notepad", 0)
        // frm.set_df_property("icd_code", "read_only", 1);

        frm.set_df_property("oasis_answer_change", "read_only", 1);


        frm.set_df_property("sticky_notes_table", "read_only", 1);
        frm.set_df_property("mitems", "read_only", 1);
        frm.set_df_property("oasis_mitems", "read_only", 1);
        frm.set_df_property("oasis_item", "read_only", 1);
        frm.set_df_property("coder_accept_error_from_qa", "read_only", 1);
        frm.set_df_property("medical_coder_comments", "read_only", 1);

        frm.set_df_property("error_marked", "read_only", 1);
        frm.set_df_property("qa_comments", "read_only", 1);
        
        frm.set_df_property("coding_post_problem", "read_only", 1);

        frm.set_df_property("clinician_name", "read_only", 1);
        frm.set_df_property("question", "read_only", 1);
        frm.set_df_property("question1", "read_only", 1); 
        frm.set_df_property("question2", "read_only", 1);
        frm.set_df_property("icd_codeqa", "read_only", 1);
        frm.set_df_property("qa_icd_comments","read_only",1)

        // frm.set_df_property("cko", "read_only", 1);
        frm.set_df_property("mitem", "read_only", 1);
        frm.set_df_property("cancer_treatments", "read_only", 1);
        frm.set_df_property("rt_mitems", "read_only", 1);
        frm.set_df_property("other", "read_only", 1);
        frm.set_df_property("ct_mitems", "read_only", 1);
        frm.set_df_property("respiratory_therapies", "read_only", 1);
        frm.set_df_property("none_mitems", "read_only", 1);
        frm.set_df_property("none_of_the_above", "read_only", 1);
        frm.set_df_property("ot_mitems", "read_only", 1);
    
      }
    }
    else if(frm.doc.workflow_state == "Coder 1st Level Appeal"){
      // frm.set_df_property("team_lead_comments", "read_only", 1);
      // frm.set_df_property("coder_accept_error_from_qa", "read_only", 1);
      frm.set_df_property("medical_coder_comments", "read_only", 1);
      frm.set_df_property("coding_post_problem", "read_only", 1);

      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.toggle_display("notepad", 0)
      frm.set_df_property("qa_icd_comments","read_only",1)

      frm.set_df_property("pdx", "read_only", 1);
      frm.set_df_property("pdpc", "read_only", 1);
      frm.set_df_property("no_of_pages", "read_only", 1);

      frm.set_df_property("type", "read_only", 1);
      frm.set_df_property("icd", "read_only", 1);
      frm.set_df_property("onsetexacerbation", "read_only", 1);
      frm.set_df_property("symptom_control_rating", "read_only", 1);
      // frm.set_df_property("icd_code", "read_only", 1);

      frm.set_df_property("oasis_answer_change", "read_only", 1);


      frm.set_df_property("sticky_notes_table", "read_only", 1);
      frm.set_df_property("mitems", "read_only", 1);
      frm.set_df_property("oasis_mitems", "read_only", 1);
      frm.set_df_property("oasis_item", "read_only", 1);
      frm.set_df_property("coder_accept_error_from_qa", "read_only", 1);
      frm.set_df_property("medical_coder_comments", "read_only", 1);

      frm.set_df_property("error_marked", "read_only", 1);
      frm.set_df_property("qa_comments", "read_only", 1);
      
      frm.set_df_property("coding_post_problem", "read_only", 1);

      frm.set_df_property("clinician_name", "read_only", 1);
      frm.set_df_property("question", "read_only", 1);
      frm.set_df_property("question1", "read_only", 1); 
      frm.set_df_property("question2", "read_only", 1);
      frm.set_df_property("icd_codeqa", "read_only", 1);


      // frm.set_df_property("cko", "read_only", 1);
      frm.set_df_property("mitem", "read_only", 1);
      frm.set_df_property("cancer_treatments", "read_only", 1);
      frm.set_df_property("rt_mitems", "read_only", 1);
      frm.set_df_property("other", "read_only", 1);
      frm.set_df_property("ct_mitems", "read_only", 1);
      frm.set_df_property("respiratory_therapies", "read_only", 1);
      frm.set_df_property("none_mitems", "read_only", 1);
      frm.set_df_property("none_of_the_above", "read_only", 1);
      frm.set_df_property("ot_mitems", "read_only", 1);

    }
    else if(frm.doc.chart_status == "Error Corrected by Coder"){
      frm.set_df_property("coder_error_comments","read_only",1);
      frm.set_df_property("accept_error_two","read_only",1);
      
      

      frm.set_df_property("coder_accept_error_from_qa", "read_only", 1);
      frm.set_df_property("medical_coder_comments", "read_only", 1);
      frm.set_df_property("coding_post_problem", "read_only", 1);

      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)
    }
    else if(frm.doc.chart_status == "Coder Error Accepted by Department Head"){
      frm.set_df_property("coder_accept_error_from_qa", "read_only", 1);
      frm.set_df_property("medical_coder_comments", "read_only", 1);
      frm.set_df_property("coding_post_problem", "read_only", 1);
      frm.set_df_property("question1", "read_only", 1); 
      frm.set_df_property("question2", "read_only", 1);

      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)

    }
    else if(frm.doc.chart_status == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal")
    {
      
      frm.set_df_property("medical_coder_comments", "read_only", 1);
      // frm.set_df_property("medical_coder_comments", "read_only", 1);
      frm.set_df_property("coder_accept_error_from_qa", "read_only", 1);

      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)

    }
    else if(frm.doc.workflow_state == "Medical Coder Review - Post QA TL Feedback")
    {
      frm.set_df_property("medical_coder_comments", "read_only", 1);
      frm.set_df_property("coder_accept_error_from_qa", "read_only", 1);

      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)
    }

    if(frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback"){
      
      frm.set_df_property("medical_coder_comments", "read_only", 1);
      frm.set_df_property("coder_accept_error_from_qa", "read_only", 1);

      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)
    }

    if(frm.doc.chart_status == "Coder 2nd Level Appeal" && frm.doc.workflow_state == "Coder 2nd Level Appeal"){
      frm.set_df_property("accept_error_two","read_only",1);
      frm.set_df_property("medical_coder_comments_two","read_only",1);
      frm.set_df_property("coder_accept_error_from_qa","read_only",1);
      frm.set_df_property("medical_coder_comments","read_only",1);
      frm.set_df_property("coder_accept_error_from_qa")
      frm.set_df_property("pdx", "read_only", 1);
      frm.set_df_property("pdpc", "read_only", 1);
      frm.set_df_property("no_of_pages", "read_only", 1);
      frm.set_df_property("type", "read_only", 1);
      frm.set_df_property("icd", "read_only", 1);
      frm.set_df_property("onsetexacerbation", "read_only", 1);
      frm.set_df_property("symptom_control_rating", "read_only", 1);
      // frm.set_df_property("icd_code", "read_only", 1);

      frm.set_df_property("oasis_answer_change", "read_only", 1);
      frm.set_df_property("sticky_notes_table", "read_only", 1);
      frm.set_df_property("mitems", "read_only", 1);
      frm.set_df_property("oasis_item", "read_only", 1);
      frm.set_df_property("coding_post_problem", "read_only", 1);
      frm.set_df_property("clinician_name", "read_only", 1);
      frm.set_df_property("question", "read_only", 1);
      frm.set_df_property("question1", "read_only", 1); 
      frm.set_df_property("question2", "read_only", 1);
      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)
      // frm.set_df_property("cko", "read_only", 1);
      frm.set_df_property("mitem", "read_only", 1);
      frm.set_df_property("cancer_treatments", "read_only", 1);
      frm.set_df_property("rt_mitems", "read_only", 1);
      frm.set_df_property("other", "read_only", 1);
      frm.set_df_property("ct_mitems", "read_only", 1);
      frm.set_df_property("respiratory_therapies", "read_only", 1);
      frm.set_df_property("none_mitems", "read_only", 1);
      frm.set_df_property("none_of_the_above", "read_only", 1);
      frm.set_df_property("ot_mitems", "read_only", 1);
      }

    if(frm.doc.chart_status == "Coder Error Accepted by Department Head" && frm.doc.workflow_state == "Coder Error Accepted by Department Head"){
      frm.set_df_property("accept_error_two","read_only",1);
      frm.set_df_property("medical_coder_comments_two","read_only",1);
      frm.set_df_property("coder_accept_error_from_qa","read_only",1);
      frm.set_df_property("medical_coder_comments","read_only",1);
      frm.set_df_property("clinician_name","read_only",1);
      frm.set_df_property("question","read_only",1);
      frm.set_df_property("coding_post_problem","read_only",1);
      frm.set_df_property("question1", "read_only", 1); 
      frm.set_df_property("question2", "read_only", 1);
      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1);
    }

    if(frm.doc.chart_status == "Error Corrected by Coder" && frm.doc.workflow_state == "Error Corrected by Coder"){
      frm.set_df_property("accept_error_two","read_only",1);
      frm.set_df_property("medical_coder_comments_two","read_only",1);
      frm.set_df_property("coder_error_comments", "read_only", 1);
      frm.set_df_property("coder_accept_error_from_qa","read_only",1);
      frm.set_df_property("medical_coder_comments","read_only",1);
      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)
    }

    if(frm.doc.workflow_state == "Coder Error Accepted by L2 Supervisor - 2nd Level Appeal"){
      frm.set_df_property("accept_error_two","read_only",1);
      frm.set_df_property("medical_coder_comments_two","read_only",1);
      frm.set_df_property("coder_accept_error_from_qa","read_only",1);
      frm.set_df_property("medical_coder_comments","read_only",1);
      frm.set_df_property("coding_post_problem","read_only",1);
      frm.set_df_property("clinician_name", "read_only", 1);
      frm.set_df_property("question", "read_only", 1);
      frm.set_df_property("question1", "read_only", 1); 
      frm.set_df_property("question2", "read_only", 1);
      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)
     
    }

    if(frm.doc.workflow_state == "Pending Quality"){
      frm.set_df_property("pdx", "read_only", 1);
      frm.set_df_property("pdpc", "read_only", 1);
      frm.set_df_property("no_of_pages", "read_only", 1);

      frm.set_df_property("type", "read_only", 1);
      frm.set_df_property("onsetexacerbation", "read_only", 1);
      frm.set_df_property("symptom_control_rating", "read_only", 1);
      frm.set_df_property("sticky_notes_table", "read_only", 1);

      frm.set_df_property("oasis_answer_change", "read_only", 1);

      frm.set_df_property("coding_post_problem", "read_only", 1);
      frm.toggle_display("notepad", 0)

      frm.set_df_property("clinician_name", "read_only", 1);
      frm.set_df_property("question", "read_only", 1);
      frm.set_df_property("question1", "read_only", 1);
      frm.set_df_property("question2", "read_only", 1);
    }

    if(frm.doc.workflow_state == "Clarification Required- Query 1" || frm.doc.workflow_state == "Clarification Required- Query 2" || frm.doc.workflow_state == "Clarification Required- Query 3")
    {
      frm.set_df_property("pdx", "read_only", 1);
      frm.set_df_property("pdpc", "read_only", 1);
      frm.set_df_property("no_of_pages", "read_only", 1);
      frm.set_df_property("hold_reason","read_only",1);
      frm.set_df_property("import_file","read_only",1);
      frm.set_df_property("type", "read_only", 1);
      frm.set_df_property("icd", "read_only", 1);
      frm.set_df_property("onsetexacerbation", "read_only", 1);
      frm.set_df_property("symptom_control_rating", "read_only", 1);
      // frm.set_df_property("icd_code", "read_only", 1);
      frm.set_df_property("oasis_answer_change", "read_only", 1);
      frm.set_df_property("sticky_notes_table", "read_only", 1);
      frm.set_df_property("mitems", "read_only", 1);
      frm.set_df_property("oasis_item", "read_only", 1);
      // frm.set_df_property("cko", "read_only", 1);
      frm.set_df_property("mitem", "read_only", 1);
      frm.set_df_property("cancer_treatments", "read_only", 1);
      frm.set_df_property("rt_mitems", "read_only", 1);
      frm.set_df_property("other", "read_only", 1);
      frm.set_df_property("ct_mitems", "read_only", 1);
      frm.set_df_property("respiratory_therapies", "read_only", 1);
      frm.set_df_property("none_mitems", "read_only", 1);
      frm.set_df_property("none_of_the_above", "read_only", 1);
      frm.set_df_property("ot_mitems", "read_only", 1);
      frm.set_df_property("coding_post_problem", "read_only", 1);
      frm.set_df_property("clinician_name", "read_only", 1);
      frm.set_df_property("question1", "read_only", 1); 
      frm.set_df_property("question2", "read_only", 1);
      frm.set_df_property("question", "read_only", 1); 
      frm.toggle_display("notepad", 0)

    }  
  }

  if(frappe.user_roles.includes('QA Inventory Allocation')&& frappe.session.user != "Administrator"  && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
    if(frm.doc.workflow_state == "Production Completed"){
      frm.toggle_display("icd_codeqa")
    }
    if(!["Production Completed","Picked for Audit"].includes(frm.doc.workflow_state)){
      frm.set_df_property("import_file", "read_only", 1); 
    }else{
      frm.toggle_display("notepad", 0)
     // frm.toggle_display(['sticky_notes_table_section'],0);
    }
  }
  
  // QA Lead
  if(frappe.user_roles.includes('QA Lead') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
    if(["Picked for Audit","Pending Quality"].includes(frm.doc.workflow_state) ){
      frm.toggle_display(["icd_codeqa","qa_icd_comments"],0);
        $(`[data-fieldname="mr_number"]`).find('form-group').hide();

    }
    if(!["Picked for Audit","Pending Quality"].includes(frm.doc.workflow_state) ){
      frm.toggle_enable(["employee"],0);
    }
    var fieldListQATL = ["Error Corrected by Coder","Coder Error Accepted by L1 supervisor - 1st Level Appeal","QA Error Rejected by QA TL","QA Manager Review - QA Appeal","QA Manager Review - Coder Error Rejected by L2 supervisor - 1st Level Appeal","QA Manager Review - Coder Error Rejected by L2 Supervisor - 2nd Level Appeal","Department Head Review - QA Error Rejected by QA Manager","QA Error Rejected by QA Manager","Coder Error Accepted by Department Head","Coder Error Accepted by L1 supervisor-Post QA TL Feedback","Coder Error Rejected by L1 supervisor-Post QA TL Feedback","Operations Manager Review - Coder Error Rejected by L1 supervisor","Coder Error Accepted by L2 supervisor - 1st Level Appeal","Coder Error Rejected by L2 supervisor - 1st Level Appeal","Coder 2nd Level Appeal","1st Level Appeal - Error Accepted by Coder","Operations Manager Review - 2nd Level Appeal","Coder Error Accepted by L2 Supervisor - 2nd Level Appeal","Coder Error Rejected by L2 Supervisor - 2nd Level Appeal","Error Marked By QA","QA Appeal","Error Corrected by QA","QA Error Accept by QA Manager","No Error","Error Accepted by QA"]	
    

    if(frm.doc.workflow_state != "Coder Error Rejected by L1 supervisor - 1st Level Appeal"){
      frm.set_df_property("accept_qa_error_by_qal", "read_only", 1);
      frm.set_df_property("qal_comments", "read_only", 1);
    }

    if(frm.doc.workflow_state == "Picked for Audit" || frm.doc.workflow_state == "Pending Quality") {
      frm.toggle_display(['pdpc_qa', 'pdx_qa','no_of_pages_qa','icd_codeqa','qa_icd_comments','pdpc_qa_comments','no_of_pages_qa_comments','pdx_qa_comments','qa_mitems_section','section_break_121'], 0);
      $(".form-column.col-sm-4").eq(1).hide();
      $(".form-column.col-sm-4").eq(2).hide();
      $(".form-column.col-sm-4").eq(4).hide();
      $(".form-column.col-sm-4").eq(5).hide();
      $('.control-label:contains("QA Feedback")').hide();
    } 
    
    // Hold Reason is showing in different WorkFlow State 
    if(['Error Marked By QA',
        'Coder Error Accepted  by L1 supervisor-Post QA TL Feedback',
        'Coder 2nd Level Appeal',
        'Operations Manager Review - 2nd Level Appeal',
        'Coder Error Rejected by L2 Supervisor - 2nd Level Appeal',
        'QA Error Rejected by QA Manager',
        'Coder Error Accepted by Department Head',
        'Coder Error Rejected  by L1 supervisor-Post QA TL Feedback',
        'Operations Manager Review - Coder Error Rejected  by L1 supervisor',
        'Coder Error Rejected  by L2 supervisor - 1st Level Appeal',
        'QA Manager Review - Coder Error Rejected  by L2 supervisor - 1st Level Appeal',
        'Coder Error Rejected by Department Head',
        'Error Corrected by QA',
        'Coder Error Accepted  by L1 supervisor - 1st Level Appeal',
        'QA Error Accepted by QA Manager',
        'QA Appeal',
        'QA Manager Review - QA Appeal',
        'Coder Error Accepted  by L2 supervisor - 1st Level Appeal',
        'Coder Error Accepted by L2 Supervisor - 2nd Level Appeal',
        'Coder Error Accepted by L2 Supervisor - 2nd Level Appeal',
        'Pending Quality',
        'Coder 1st Level Appeal','QA Error Accepted by QA TL',
        'Department Head Review - QA Error Rejected by QA Manager'].includes(frm.doc.workflow_state)){
      frm.set_df_property('hold_reason','read_only',0);
      frm.set_df_property("import_file", "read_only", 1); 
    }

    if(frm.doc.workflow_state == "QA Error Accepted by QA TL"){
      frm.set_df_property("hold_reason","read_only",1)
    }

  }
  
  // QA 
  if(frappe.user_roles.includes('QA') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
    // frm.toggle_display("section_break_79",0);
    if (!["QA Error Accepted by QA TL"].includes(frm.doc.workflow_state)){
      frm.set_df_property("qa_error_comment", "read_only", 1);
    }
    var fieldListQA = [
                      "Error Corrected by Coder",
                      "Coder 1st Level Appeal",
                      "Coder Error Rejected by L1 supervisor - 1st Level Appeal",
                      "Coder Error Accepted  by L1 supervisor - 1st Level Appeal",
                      "QA Error Rejected by QA TL",
                      "QA Manager Review - QA Appeal",
                      "QA Manager Review - Coder Error Rejected by L2 supervisor - 1st Level Appeal",
                      "QA Manager Review - Coder Error Rejected by L2 Supervisor - 2nd Level Appeal",
                      "Department Head Review - QA Error Rejected by QA Manager",
                      "QA Error Rejected by QA Manager",
                      "Coder Error Accepted by Department Head",
                      "Coder Error Accepted by L1 supervisor-Post QA TL Feedback",
                      "Coder Error Rejected by L1 supervisor-Post QA TL Feedback",
                      "Operations Manager Review - Coder Error Rejected by L1 supervisor",
                      "Coder Error Accepted by L2 supervisor - 1st Level Appeal",
                      "Coder Error Rejected by L2 supervisor - 1st Level Appeal",
                      "Coder 2nd Level Appeal",
                      "1st Level Appeal - Error Accepted by Coder",
                      "Operations Manager Review - 2nd Level Appeal",
                      "Coder Error Accepted by L2 Supervisor - 2nd Level Appeal",
                      "Coder Error Rejected by L2 Supervisor - 2nd Level Appeal",
                      "Chart Locked",
                      "QA Error Rejected by QA Lead",
                      "Coder Error Rejected  by L1 supervisor-Post QA TL Feedback",
                      "Operations Manager Review - Coder Error Rejected  by L1 supervisor",
                      "Coder Error Rejected  by L2 supervisor - 1st Level Appeal",
                      "QA Manager Review - Coder Error Rejected  by L2 supervisor - 1st Level Appeal",
                      "QA Error Rejected by QA Manager",
                      "Department Head Review - QA Error Rejected by QA Manager",
                      "Coder Error Accepted by Department Head",
                      "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback",
                      'QA Error Rejected  by QA TL'
                    ]

    
      if(fieldListQA.includes(frm.doc.workflow_state)){
        frm.set_df_property("import_file", "read_only", 1); 
        frm.set_df_property("qa_error_comments", "read_only", 1); 
        frm.set_df_property("error_marked", "read_only", 1);
        frm.set_df_property("qa_comment", "read_only", 1);
        frm.set_df_property("qa_mitems", "read_only", 1);

        frm.set_df_property("qa_table","read_only",1);

        frm.set_df_property("qa_error_comment", "read_only", 1);
        frm.set_df_property("accept_error_from_qa_lead", "read_only", 1);
        frm.set_df_property("pdpc_qa", "read_only", 1);
        frm.set_df_property("pdx_qa", "read_only", 1);
        frm.set_df_property("no_of_pages_qa", "read_only", 1);
        // frm.set_df_property("type_qa", "read_only", 1);
        // frm.set_df_property("onsetexacerbation_qa", "read_only", 1);
        // frm.set_df_property("symptom_control_rating_qa", "read_only", 1);
        frm.toggle_display("notepad", 0)
        frm.set_df_property("icd_code_qa", "read_only", 1);
        frm.set_df_property("icd_codeqa", "read_only", 1);
        frm.set_df_property("qa_icd_comments","read_only",1)

        //  QA Comments Feedback
        frm.set_df_property("pdpc_qa_comments", "read_only", 1);
        frm.set_df_property("no_of_pages_qa_comments", "read_only", 1);
        frm.set_df_property("pdx_qa_comments", "read_only", 1);
        // frm.set_df_property("type_qa_comments", "read_only", 1);
        // frm.set_df_property("onsetexacerbation_qa_comments", "read_only", 1);
        // frm.set_df_property("symptom_control_rating_qa_comments", "read_only", 1);

        // QA O series Mitems
        // frm.set_df_property("check_for_o_series_mitems", "read_only", 1);
        frm.set_df_property("mitem", "read_only", 1);
        frm.set_df_property("qact", "read_only", 1);
        frm.set_df_property("qact_mitems", "read_only", 1);
        frm.set_df_property("qaot", "read_only", 1);
        frm.set_df_property("qaot_mitems", "read_only", 1);
        frm.set_df_property("qart", "read_only", 1);
        frm.set_df_property("qart_mitems", "read_only", 1);
        frm.set_df_property("qanone", "read_only", 1);
        frm.set_df_property("qanone_mitems", "read_only", 1);
        frm.set_df_property("rs_qact_mitems", "read_only", 1);
        frm.set_df_property("rs_qaot_mitems", "read_only", 1);
        frm.set_df_property("rs_qart_mitems", "read_only", 1);
        frm.set_df_property("rs_qanone_mitems", "read_only", 1);

      }

    if(frm.doc.workflow_state == "QA Error Accepted by QA TL" && frm.doc.chart_status == "QA Error Accepted by QA TL" && frm.doc.accept_error_from_qa_lead == "Yes" && frm.doc.qa_tick ){
      if(!frm.doc.__unsaved){
        frm.set_df_property("hold_reason",'read_only',1);
        frm.set_df_property("accept_error_from_qa_lead", "read_only",1);
        frm.set_df_property("qa_tick", "read_only", 1);
        frm.set_df_property("qa_error_comment", "read_only", 1);
        frm.set_df_property("pdpc_qa", "read_only", 1);
        frm.set_df_property("no_of_pages_qa", "read_only", 1);
        frm.set_df_property("pdx_qa", "read_only", 1);
        // frm.set_df_property("type_qa", "read_only", 1);
        // frm.set_df_property("onsetexacerbation_qa", "read_only", 1);
        // frm.set_df_property("symptom_control_rating_qa", "read_only", 1);
        frm.set_df_property("icd_code_qa", "ready_only", 1);
  
        //  QA Comments Feedback
        frm.set_df_property("pdpc_qa_comments", "read_only", 1);
        frm.set_df_property("no_of_pages_qa_comments", "read_only", 1);
        frm.set_df_property("pdx_qa_comments", "read_only", 1);
        // frm.set_df_property("type_qa_comments", "read_only", 1);
        // frm.set_df_property("onsetexacerbation_qa_comments", "read_only", 1);
        // frm.set_df_property("symptom_control_rating_qa_comments", "read_only", 1);
        frm.set_df_property("error_marked", "read_only", 1);
        frm.set_df_property("qa_mitems", "read_only", 1);
        frm.set_df_property("accept_error_from_qa_lead","read_only", 1);

        // QA O series Mitems
        // frm.set_df_property("check_for_o_series_mitems", "read_only", 1);
        frm.set_df_property("mitem", "read_only", 1);
        frm.set_df_property("qact", "read_only", 1);
        frm.set_df_property("qact_mitems", "read_only", 1);
        frm.set_df_property("qaot", "read_only", 1);
        frm.set_df_property("qaot_mitems", "read_only", 1);
        frm.set_df_property("qart", "read_only", 1);
        frm.set_df_property("qart_mitems", "read_only", 1);
        frm.set_df_property("qanone", "read_only", 1);
        frm.set_df_property("qanone_mitems", "read_only", 1);
        frm.set_df_property("icd_codeqa", "read_only", 1);
        frm.set_df_property("qa_icd_comments","read_only",1);
        frm.set_df_property("error_marked", "read_only", 1);
        frm.set_df_property("qa_mitems", "read_only", 1);
        frm.set_df_property("qa_table", "read_only", 1);

        // Readonly fields For the Reason For change in QA Section 
        frm.set_df_property("rs_qact_mitems", "read_only", 1);
        frm.set_df_property("rs_qart_mitems", "read_only", 1);
        frm.set_df_property("rs_qaot_mitems", "read_only", 1);
        frm.set_df_property("rs_qanone_mitems", "read_only", 1);
        frm.set_df_property("oasis_item", "read_only", 1);
        frm.toggle_display("notepad", 0)
      }

    }

    if(frm.doc.workflow_state == 'QA Error Accepted by QA TL'){
      frm.set_df_property("hold_reason","read_only",0);
    }

    if(!["Coder Error Rejected by Department Head","QA Error Accepted by QA TL","QA Error Accepted by QA Manager","Pending Quality"].includes(frm.doc.workflow_state)){
      frm.set_df_property("hold_reason","read_only",1);
      frm.set_df_property("import_file","read_only",1);
    }

    if(frm.doc.chart_status == "No Error"){
      frm.set_df_property("error_marked", "read_only", 1);
      frm.set_df_property("qa_comment", "read_only", 1);
      frm.set_df_property("qa_mitems", "read_only", 1);

      frm.set_df_property("qa_table","read_only",1);
      frm.set_df_property("pdpc_qa", "read_only", 1);
      frm.set_df_property("pdx_qa", "read_only", 1);
      frm.set_df_property("no_of_pages_qa", "read_only", 1);
      // frm.set_df_property("type_qa", "read_only", 1);
      // frm.set_df_property("onsetexacerbation_qa", "read_only", 1);
      // frm.set_df_property("symptom_control_rating_qa", "read_only", 1);
      frm.set_df_property("icd_code_qa", "read_only", 1);  
      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1);
      // frm.set_df_property("check_for_o_series_mitems", "read_only", 1);
      frm.set_df_property("qact", "read_only", 1); 
      frm.set_df_property("qact_mitems", "read_only", 1); 
      frm.set_df_property("rs_qact_mitems", "read_only", 1); 
      frm.set_df_property("qart", "read_only", 1); 
      frm.set_df_property("qart_mitems", "read_only", 1); 
      frm.set_df_property("rs_qart_mitems", "read_only", 1); 
      frm.set_df_property("qaot", "read_only", 1); 
      frm.set_df_property("qaot_mitems", "read_only", 1); 
      frm.set_df_property("rs_qaot_mitems", "read_only", 1); 
      frm.set_df_property("qanone", "read_only", 1); 
      frm.set_df_property("qanone_mitems", "read_only", 1); 
      frm.set_df_property("rs_qanone_mitems", "read_only", 1); 
      // frm.set_df_property("check_for_o_series_mitems", "read_only", 1); 
      
      //  QA Comments Feedback
      frm.set_df_property("pdpc_qa_comments", "read_only", 1);
      frm.set_df_property("no_of_pages_qa_comments", "read_only", 1);
      frm.set_df_property("pdx_qa_comments", "read_only", 1);
      // frm.set_df_property("type_qa_comments", "read_only", 1);
      // frm.set_df_property("onsetexacerbation_qa_comments", "read_only", 1);
      // frm.set_df_property("symptom_control_rating_qa_comments", "read_only", 1); 
      frm.toggle_display("notepad", 0)
    }
    
    if(frm.doc.chart_status == "Error Marked By QA"){
      frm.set_df_property("error_marked", "read_only", 1);
      frm.set_df_property("qa_comment", "read_only", 1);
      frm.set_df_property("qa_mitems", "read_only", 1);

      frm.set_df_property("oasis_item","read_only",1);
      
      frm.set_df_property("icd_code_qa", "read_only", 1);  
      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)
      // frm.set_df_property("check_for_o_series_mitems", "read_only", 1);
      frm.set_df_property("qact", "read_only", 1); 
      frm.set_df_property("qact_mitems", "read_only", 1); 
      frm.set_df_property("rs_qact_mitems", "read_only", 1); 
      frm.set_df_property("qart", "read_only", 1); 
      frm.set_df_property("qart_mitems", "read_only", 1); 
      frm.set_df_property("rs_qart_mitems", "read_only", 1); 
      frm.set_df_property("qaot", "read_only", 1); 
      frm.set_df_property("qaot_mitems", "read_only", 1); 
      frm.set_df_property("rs_qaot_mitems", "read_only", 1); 
      frm.set_df_property("qanone", "read_only", 1); 
      frm.set_df_property("qanone_mitems", "read_only", 1); 
      frm.set_df_property("rs_qanone_mitems", "read_only", 1);
      frm.toggle_display("notepad", 0)
      //frm.toggle_display(['sticky_notes_table_section'],0);

    }
    else if(frm.doc.chart_status == "QA Error Accepted by QA TL" && (frm.doc.workflow_state == "QA Error Accepted by QA TL" && frm.doc.accept_error_from_qa_lead == "No" && frm.doc.qa_tick ))
    {
      if(!frm.doc.__unsaved){
      frm.set_df_property("hold_reason",'read_only',1);
      frm.set_df_property("qa_tick", "read_only", 1);
      frm.set_df_property('accept_error_from_qa_lead',"read_only",1)
      frm.set_df_property("qa_error_comment", "read_only", 1);
      frm.set_df_property("error_marked", "read_only", 1);
      frm.set_df_property("qa_comment", "read_only", 1);
      frm.set_df_property("qa_mitems", "read_only", 1);
      frm.set_df_property("qa_table","read_only",1);
      // frm.set_df_property("pdpc_qa", "read_only", 1);
      // frm.set_df_property("pdx_qa", "read_only", 1);
      // frm.set_df_property("no_of_pages_qa", "read_only", 1);
      // frm.set_df_property("type_qa", "read_only", 1);
      // frm.set_df_property("onsetexacerbation_qa", "read_only", 1);
      // frm.set_df_property("symptom_control_rating_qa", "read_only", 1);
      frm.set_df_property("icd_code_qa", "read_only", 1);
      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)

      //  QA Comments Feedback
      // frm.set_df_property("pdpc_qa_comments", "read_only", 1);
      // frm.set_df_property("no_of_pages_qa_comments", "read_only", 1);
      // frm.set_df_property("pdx_qa_comments", "read_only", 1);
      // frm.set_df_property("type_qa_comments", "read_only", 1);
      // frm.set_df_property("onsetexacerbation_qa_comments", "read_only", 1);
      // frm.set_df_property("symptom_control_rating_qa_comments", "read_only", 1);

      // frm.set_df_property("check_for_o_series_mitems", "read_only", 1);
      frm.set_df_property("mitem", "read_only", 1);
      frm.set_df_property("qact", "read_only", 1);
      frm.set_df_property("qact_mitems", "read_only", 1);
      frm.set_df_property("qaot", "read_only", 1);
      frm.set_df_property("qaot_mitems", "read_only", 1);
      frm.set_df_property("qart", "read_only", 1);
      frm.set_df_property("qart_mitems", "read_only", 1);
      frm.set_df_property("qanone", "read_only", 1);
      frm.set_df_property("qanone_mitems", "read_only", 1);


      frm.set_df_property("rs_qact_mitems", "read_only", 1);
      frm.set_df_property("rs_qaot_mitems", "read_only", 1);
      frm.set_df_property("rs_qart_mitems", "read_only", 1);
      frm.set_df_property("rs_qanone_mitems", "read_only", 1);    
      frm.toggle_display("qa_weightage_button", 0)   
      }

    }
    else if (frm.doc.chart_status == "QA Error Accepted by QA TL" && (frm.doc.workflow_state == "QA Error Accepted by QA TL" && frm.doc.accept_error_from_qa_lead == "No")){

      var fields = ["error_marked","qa_comment","qa_mitems",
                    "qa_table","icd_code_qa","icd_codeqa","qa_icd_comments",
                    "mitem","qact","qact_mitems","qaot","qaot_mitems",
                    "qart","qart_mitems","qanone","qanone_mitems","rs_qact_mitems","rs_qaot_mitems",
                    "rs_qart_mitems","rs_qanone_mitems"
                  ]
      fields.forEach((field)=>{
        frm.set_df_property(field,'read_only',1)
      })
      frm.toggle_display("qa_weightage_button", 0);
      frm.toggle_display("notepad", 0)
      frm.set_df_property("oasis_item","read_only",1);
    }    
    else if(frm.doc.chart_status == "QA Error Accepted by QA Manager" && frm.doc.workflow_state == "QA Error Accepted by QA Manager")
    {
    
      frm.set_df_property("error_marked", "read_only", 1);
      frm.set_df_property("qa_comment", "read_only", 1);
      frm.set_df_property("qa_error_comment", "read_only", 1);
      frm.set_df_property("accept_error_from_qa_lead", "read_only", 1);
      if(!frm.doc.hold_reason){
        frm.set_df_property("qa_mitems", "read_only", 0);
      frm.set_df_property("qa_table","read_only",0);
      }
     
    }

    else if(frm.doc.chart_status == "Error Corrected by QA" && frm.doc.workflow_state == "Error Corrected by QA"){
      frm.set_df_property("qa_error_comments", "read_only", 1); 
      frm.set_df_property("error_marked", "read_only", 1);
      frm.set_df_property("qa_comment", "read_only", 1);
      frm.set_df_property("qa_mitems", "read_only", 1);
      frm.set_df_property("qa_table","read_only",1);
      frm.set_df_property("qa_error_comment", "read_only", 1);
      frm.set_df_property("accept_error_from_qa_lead", "read_only", 1);
      frm.set_df_property("pdpc_qa", "read_only", 1);
      frm.set_df_property("pdx_qa", "read_only", 1);
      frm.set_df_property("no_of_pages_qa", "read_only", 1);
      // frm.set_df_property("type_qa", "read_only", 1);
      // frm.set_df_property("onsetexacerbation_qa", "read_only", 1);
      // frm.set_df_property("symptom_control_rating_qa", "read_only", 1);
      frm.set_df_property("icd_code_qa", "read_only", 1);
      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)

      //  QA Comments Feedback
      frm.set_df_property("pdpc_qa_comments", "read_only", 1);
      frm.set_df_property("no_of_pages_qa_comments", "read_only", 1);
      frm.set_df_property("pdx_qa_comments", "read_only", 1);
      // frm.set_df_property("type_qa_comments", "read_only", 1);
      // frm.set_df_property("onsetexacerbation_qa_comments", "read_only", 1);
      // frm.set_df_property("symptom_control_rating_qa_comments", "read_only", 1);

      // QA O series Mitems
      // frm.set_df_property("check_for_o_series_mitems", "read_only", 1);
      frm.set_df_property("mitem", "read_only", 1);
      frm.set_df_property("qact", "read_only", 1);
      frm.set_df_property("qact_mitems", "read_only", 1);
      frm.set_df_property("qaot", "read_only", 1);
      frm.set_df_property("qaot_mitems", "read_only", 1);
      frm.set_df_property("qart", "read_only", 1);
      frm.set_df_property("qart_mitems", "read_only", 1);
      frm.set_df_property("qanone", "read_only", 1);
      frm.set_df_property("qanone_mitems", "read_only", 1);


      frm.set_df_property("rs_qact_mitems", "read_only", 1);
      frm.set_df_property("rs_qaot_mitems", "read_only", 1);
      frm.set_df_property("rs_qart_mitems", "read_only", 1);
      frm.set_df_property("rs_qanone_mitems", "read_only", 1);
      frm.set_df_property("oasis_item", "read_only", 1);
      frm.toggle_display("notepad", 0)

    }
    else if(frm.doc.chart_status == "Error Accepted by QA"){
      
      frm.set_df_property("accept_error_from_qa_lead", "read_only", 1);
      frm.set_df_property("qa_error_comments", "read_only", 1); 
      frm.set_df_property("pdpc_qa", "read_only", 1);
      frm.set_df_property("pdx_qa", "read_only", 1);
      frm.set_df_property("no_of_pages_qa", "read_only", 1);
      // frm.set_df_property("type_qa", "read_only", 1);
      // frm.set_df_property("onsetexacerbation_qa", "read_only", 1);
      // frm.set_df_property("symptom_control_rating_qa", "read_only", 1);
      frm.set_df_property("icd_code_qa", "read_only", 1);
      frm.set_df_property("icd_codeqa", "read_only", 1);
              frm.set_df_property("qa_icd_comments","read_only",1)

      //  QA Comments Feedback
      frm.set_df_property("pdpc_qa_comments", "read_only", 1);
      frm.set_df_property("no_of_pages_qa_comments", "read_only", 1);
      frm.set_df_property("pdx_qa_comments", "read_only", 1);
      // frm.set_df_property("type_qa_comments", "read_only", 1);
      // frm.set_df_property("onsetexacerbation_qa_comments", "read_only", 1);
      // frm.set_df_property("symptom_control_rating_qa_comments", "read_only", 1);

      // QA O series Mitems
      // frm.set_df_property("check_for_o_series_mitems", "read_only", 1);
      frm.set_df_property("mitem", "read_only", 1);
      frm.set_df_property("qact", "read_only", 1);
      frm.set_df_property("qact_mitems", "read_only", 1);
      frm.set_df_property("qaot", "read_only", 1);
      frm.set_df_property("qaot_mitems", "read_only", 1);
      frm.set_df_property("qart", "read_only", 1);
      frm.set_df_property("qart_mitems", "read_only", 1);
      frm.set_df_property("qanone", "read_only", 1);
      frm.set_df_property("qanone_mitems", "read_only", 1);
    }
    else if(frm.doc.chart_status == "QA Appeal"){

      frm.set_df_property("error_marked", "read_only", 1);
      frm.set_df_property("qa_error_comment", "read_only", 1);
      frm.set_df_property("accept_error_from_qa_lead", "read_only", 1);
      frm.set_df_property("qa_mitems", "read_only", 1);
      frm.set_df_property("qa_comment", "read_only", 1);
      frm.set_df_property("qa_table", "read_only", 1);
      frm.set_df_property("oasis_item", "read_only", 1);
      frm.set_df_property("pdpc_qa", "read_only", 1);
      frm.set_df_property("pdx_qa", "read_only", 1);
      frm.set_df_property("no_of_pages_qa", "read_only", 1);
      // frm.set_df_property("type_qa", "read_only", 1);
      // frm.set_df_property("onsetexacerbation_qa", "read_only", 1);
      // frm.set_df_property("symptom_control_rating_qa", "read_only", 1);
      frm.set_df_property("icd_code_qa", "read_only", 1);
      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)

      //  QA Comments Feedback
      frm.set_df_property("pdpc_qa_comments", "read_only", 1);
      frm.set_df_property("no_of_pages_qa_comments", "read_only", 1);
      frm.set_df_property("pdx_qa_comments", "read_only", 1);
      // frm.set_df_property("type_qa_comments", "read_only", 1);
      // frm.set_df_property("onsetexacerbation_qa_comments", "read_only", 1);
      // frm.set_df_property("symptom_control_rating_qa_comments", "read_only", 1);

      // QA O series Mitems
      // frm.set_df_property("check_for_o_series_mitems", "read_only", 1);
      frm.set_df_property("mitem", "read_only", 1);
      frm.set_df_property("qact", "read_only", 1);
      frm.set_df_property("qact_mitems", "read_only", 1);
      frm.set_df_property("qaot", "read_only", 1);
      frm.set_df_property("qaot_mitems", "read_only", 1);
      frm.set_df_property("qart", "read_only", 1);
      frm.set_df_property("qart_mitems", "read_only", 1);
      frm.set_df_property("qanone", "read_only", 1);
      frm.set_df_property("qanone_mitems", "read_only", 1);
      frm.set_df_property("rs_qact_mitems", "read_only", 1);
      frm.set_df_property("rs_qart_mitems", "read_only", 1);
      frm.set_df_property("rs_qaot_mitems", "read_only", 1);
      frm.set_df_property("rs_qanone_mitems", "read_only", 1);

    }
    else if(frm.doc.chart_status == "Coder Error Rejected by Department Head" && frm.doc.workflow_state == "Coder Error Rejected by Department Head"){

      frm.set_df_property("qa_error_comment", "read_only", 1);
      frm.set_df_property("accept_error_from_qa_lead", "read_only", 1);
      frm.set_df_property("error_marked", "read_only", 1);
      frm.set_df_property("qa_comment", "read_only", 1);
    }
  }
  
  if(frappe.user_roles.includes('Operations Manager' || frappe.user_roles.includes('WMS Manager') || frappe.user_roles.includes('Super Admin')) && frappe.session.user != "Administrator"){
    if(frm.doc.workflow_state != "Operations Manager Review - Coder Error Rejected  by L1 supervisor"){
      frm.set_df_property("accept_coder_error_by_operations_manager_two", "read_only", 1);
      frm.set_df_property("op_manager_comments", "read_only", 1);
    }

    if(frm.doc.workflow_state != "Operations Manager Review - 2nd Level Appeal"){
      frm.set_df_property("accept_coder_by_operation_manager", "read_only", 1);
      frm.set_df_property("op_manager_comments_two", "read_only", 1);
    }

    if(!["Operations Manager Review - Coder Error Rejected  by L1 supervisor","Operations Manager Review - 2nd Level Appeal"].includes(frm.doc.workflow_state)){
      frm.set_df_property("hold_reason","read_only",1);
      frm.set_df_property("import_file","read_only",1);

    }
  }

  if((frappe.user_roles.includes('QA Manager') || frappe.user_roles.includes('WMS Manager') || frappe.user_roles.includes('Super Admin')) && frappe.session.user != "Administrator"){
      var fieldListQAM = ["QA Error Accepted by QA Manager",
              "QA Error Rejected by QA Manager",
              "Coder Error Accepted by Department Head",
              "Coder Error Rejected by Department Head",
              "Department Head Review - QA Error Rejected by QA Manager",
              "Error Corrected by QA",
              "Error Corrected by Coder",
              "Coder Error Rejected by L2 Supervisor - 2nd Level Appeal",
              "Coder Error Rejected by L2 supervisor - 1st Level Appeal"
            ]
                      
    fieldListQAM.forEach(function(fields){
      if(frm.doc.workflow_state == [fields]){
        frm.set_df_property("accept_qa_error_by_qa_manager", "read_only", 1);
        frm.set_df_property("qam_comments", "read_only", 1);
      }
    })

    if(!["QA Manager Review - Coder Error Rejected  by L2 supervisor - 1st Level Appeal",
        "QA Manager Review - Coder Error Rejected by L2 Supervisor - 2nd Level Appeal",
        "QA Manager Review - QA Appeal"].includes(frm.doc.workflow_state)){

        frm.set_df_property("hold_reason","read_only",1);
        frm.set_df_property("import_file","read_only",1);
        frm.toggle_display(["accept_qa_error_qam"]);
        frm.set_df_property("qam_comments","read_only",1);

    }

    if(frm.doc.workflow_state == "QA Manager Review - Coder Error Rejected  by L2 supervisor - 1st Level Appeal" && !frm.doc.hold_reason){
      frm.set_df_property("accept_qa_error_by_qa_manager", "read_only", 0);
      frm.set_df_property("qam_comments", "read_only", 0);
    }

    if(frm.doc.workflow_state == "Coder Error Rejected by L2 Supervisor - 2nd Level Appeal" || frm.doc.workflow_state == "Coder Error Rejected  by L2 supervisor - 1st Level Appeal" || frm.doc.workflow_state == "QA Appeal"){
      frm.set_df_property("accept_qa_error_by_qa_manager", "read_only", 1);
      frm.set_df_property("qam_comments", "read_only", 1);
    }

    if(frm.doc.workflow_state == "QA Manager Review - QA Appeal" && !frm.doc.hold_reason){
      frm.set_df_property("accept_qa_error_by_qa_manager", "read_only", 0);
      frm.set_df_property("qam_comments", "read_only", 0);
    }

    if(frm.doc.chart_status == "QA Error Rejected by QA Manager" && frm.doc.workflow_state == "QA Error Rejected by QA Manager"){
      frm.set_df_property("accept_qa_error_by_qa_manager", "read_only", 1);
      frm.set_df_property("qam_comments", "read_only", 1);
      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)

    }
    else if(frm.doc.chart_status == "QA Error Accepted by QA Manager" && frm.doc.workflow_state == "QA Error Accepted by QA Manager"){
      frm.set_df_property("accept_qa_error_by_qa_manager", "read_only", 1);
      frm.set_df_property("qam_comments", "read_only", 1);
      frm.set_df_property("icd_codeqa", "read_only", 1);
      frm.set_df_property("qa_icd_comments","read_only",1)
    }
  }

  // Department Head
  if(frappe.user_roles.includes('Department Head') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
    if(frm.doc.workflow_state != "Department Head Review - QA Error Rejected by QA Manager"){
      frm.set_df_property("accept_coder_error_by_dept_head", "read_only", 1);
      frm.set_df_property("dept_head_comments", "read_only", 1);
    }

    if(!["Department Head Review - QA Error Rejected by QA Manager"].includes(frm.doc.workflow_state)){
      frm.set_df_property("hold_reason","read_only",1);
      frm.set_df_property("import_file","read_only",1);
    }
    if(["Department Head Review - QA Error Rejected by QA Manager"].includes(frm.doc.workflow_state)){
      frm.set_df_property("hold_reason","read_only",0);
    }
  }
  display_serial_numbers_in_icd_code()
},


})

function clinical_name_question_manadatory_yes(frm){
  if (frm.doc.coding_post_problem == 'YES'){
    frm.toggle_reqd(['clinician_name','question'], 1);
  }
}

function clinical_name_question_manadatory_no(frm){
if (frm.doc.coding_post_problem == 'NO'){
  frm.toggle_reqd(['clinician_name','question'], 0);
  frm.set_value("clinician_name","")
  frm.set_value("question","")
}

}

frappe.realtime.on('sync_doc',()=>{
cur_frm.reload_doc();
setTimeout(()=>{
  
  var fieldList = ["no_of_pages_qa","pdx_qa",
                  "pdpc_qa","icd_code_qa",
                  "pdpc_qa_comments",
                  "no_of_pages_qa_comments",
                  "pdx_qa_comments",
                  ]
      fieldList.forEach(function(field) { 
      if(localStorage.getItem[field] != undefined){        
        frappe.model.set_value(cur_frm.doc.doctype,cur_frm.doc.name,field,localStorage.getItem(field));
      }
    })    
  frappe.model.set_value(cur_frm.doc.doctype,cur_frm.doc.name,'error_marked',localStorage.getItem(cur_frm.doc.name));
  
},700)

})


// -------------------------- sticky_notes_table --------------------------
// frappe.ui.form.on('Secondary Diagnostics', {

// sticky_notes_table_add:function(frm,cdt,cdn){
    // check_duplicates(frm,cdt,cdn)
    
// })


function check_duplicates(table,undefined_flag){
    table = table.filter(function(value) {
      return value !== "";
    });
    let flag = false
    var duplicates = ""
    for (let [key, value] of findDuplicatesWithIndex(table)) {
      if(value.length > 1){
        flag = true
        duplicates += `(${key} : ${value})` + " <br> "
      }
    }

    if(flag && !undefined_flag){
      frappe.msgprint({message:__(`Duplicate ICD Codes Found : <br> ${duplicates}`),indicator:'orange',title: __('Sticky Notes Table'),})
    }
}


function findDuplicatesWithIndex(arr) {
let set = new Set();
let duplicates = new Map();
arr.forEach((item, index) => {

  if(duplicates.has(item.trim())) {
    duplicates.get(item.trim()).push(index+1);
  } else {
    duplicates.set(item.trim(), [index + 1]);
  }
  
}
)
return duplicates;
}


function mandatory_fields_to_condition_based(frm){
// Production TL
if(frappe.user_roles.includes("Production TL") ||frappe.user_roles.includes( "Administrator") || frappe.user_roles.includes('WMS Manager') || frappe.user_roles.includes('Super Admin'))
{
  const cfla = frm.doc.workflow_state.slice(16);
  const qerbqtl = frm.doc.workflow_state.slice(22);
  const crl1s = frm.doc.workflow_state.slice(20);
  const cr2 = frm.doc.workflow_state.slice(24);
  const cr3 = frm.doc.workflow_state.slice(24);

  if(crl1s == "ed (L1 Supervisor)" && !frm.doc.coding_post_problem_amswer_comments){
    frm.scroll_to_field("coding_post_problem_amswer_comments")
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below Mandatory fields')
    });
   
  }
  if(cr2 == "Query 2" && !frm.doc.cppa){
    frm.scroll_to_field("cppa")
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Please enter Coding Post Problem Answer 2 before proceeding')
    });
   
  }
  if(cr3 == "Query 3" && !frm.doc.cppa1){
    frm.scroll_to_field("cppa1")
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Please enter Coding Post Problem Answer 3 before proceeding')
    });
    
  }

  if((frm.doc.accept_coder_error_from_coder == "No" || frm.doc.accept_coder_error_from_coder == "Yes") && cfla == "Appeal" && !frm.doc.team_lead_comments){
    frm.scroll_to_field("team_lead_comments") 
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below Mandatory fields')
    });
   
  }  

  else if((frm.doc.accept_coder_error_from_qa_lead == "No" || frm.doc.accept_coder_error_from_qa_lead == "Yes") && qerbqtl == "QA TL" && !frm.doc.team_lead_comments_by_qal_feedback){
    frm.scroll_to_field("team_lead_comments_by_qal_feedback") 
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below Mandatory fields')
    });
    
  }

  const cppac = frm.doc.workflow_state.slice(24)

  if(cppac == "Query 1" && !frm.doc.coding_post_problem_amswer_comments){
    frm.scroll_to_field("coding_post_problem_amswer_comments") 
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Please enter <b>Coding Post Problem Answer</b> before proceeding')
    });
    
  }
}
// Production TL Ends

// Medical Coder
if(frappe.user_roles.includes("Medical Coder") || frappe.user_roles.includes("Administrator")|| frappe.user_roles.includes('WMS Manager') || frappe.user_roles.includes('Super Admin'))
{
  const errormarkedqa = frm.doc.workflow_state.slice(16);

  if(errormarkedqa == "QA" && (!frm.doc.medical_coder_comments || !frm.doc.mc_tick)){
    frm.scroll_to_field("medical_coder_comments")     
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below mandatory field <b>"Medical Coder Comments"</b> and <b>please confirm to save</b> ')
    });
   
  }

  const ceabdt = frm.doc.workflow_state.slice(12);

  if(ceabdt == "Accepted by Department Head" && !frm.doc.coder_error_comments)
  {   
    frm.scroll_to_field("coder_error_comments")   
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below Mandatory fields')
    });
  }

  const postqatlfb = frm.doc.workflow_state.slice(50);
  if(frm.doc.accept_error_two == "Yes" && postqatlfb == "Feedback" && (!frm.doc.medical_coder_comments_two || !frm.doc.mc_tick_two)){
    frm.scroll_to_field("medical_coder_comments_two")
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below Mandatory fields <b>"Medical Coder Comments"</b> and <b>please confirm to save</b>')
    });
    
    }
  if(frm.doc.accept_error_two == "No" && postqatlfb == "Feedback" && (!frm.doc.medical_coder_comments_two || !frm.doc.mc_tick_two)){
    frm.scroll_to_field("medical_coder_comments_two")
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below Mandatory fields <b>"Medical Coder Comments"</b> and <b>please confirm to save</b>')
    });
  
  }
 
if((frm.doc.workflow_state.slice(25) == "L2 supervisor - 1st Level Appeal" || frm.doc.workflow_state.slice(12) == "Accepted by L2 Supervisor - 2nd Level Appeal") && !frm.doc.coder_error_comments){
  frm.scroll_to_field("coder_error_comments")
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below Mandatory fields')
    });
   
  }

  const ceafla = frm.doc.workflow_state.slice(25)

  if((frm.doc.error_based_on_feedback_received2 == "No" || frm.doc.error_based_on_feedback_received2 == "Yes") && ceafla == "L1 supervisor - 1st Level Appeal" &&  (!frm.doc.medical_coder_comment3 || !frm.doc.mc_tick_3)){
    frm.scroll_to_field("medical_coder_comment3")
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below Mandatory fields <b>"Medical Coder Comments"</b> and <b>please confirm to save</b>')
    });
  
  } 

}
// Ends Medical Coder

// QA Lead
if(frappe.user_roles.includes("QA Lead")||frappe.user_roles.includes("Administrator")|| frappe.user_roles.includes('WMS Manager') || frappe.user_roles.includes('Super Admin')){
  const colevelappeal = frm.doc.workflow_state.slice(44)

  if((frm.doc.accept_qa_error_by_qal == "Yes" || frm.doc.accept_qa_error_by_qal == "No") && colevelappeal == "Level Appeal" && !frm.doc.qal_comments){
    frm.scroll_to_field("qal_comments")
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below Mandatory fields')
    });
    
  }
}
// QA Lead Ends

if(frappe.user_roles.includes("QA") ||frappe.user_roles.includes("Administrator") || frappe.user_roles.includes('WMS Manager') || frappe.user_roles.includes('Super Admin')){
  const qaerrortl = frm.doc.workflow_state.slice(24)
  if(qaerrortl == "TL" && (!frm.doc.qa_error_comment || !frm.doc.qa_tick)){
    frm.scroll_to_field("qa_error_comment")
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below mandatory fields <b>"QA Error Comments"</b> and <b>please confirm to save</b>')
    });
    
  }
  const qaerror = frm.doc.workflow_state.slice(9);

  if(qaerror == "Accepted by QA Manager" && !frm.doc.qa_error_comments){
    frm.scroll_to_field("qa_error_comments")
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below Mandatory fields <b>"QA Error Comments"</b>')
    });
    
  }

  if(frm.doc.workflow_state.slice(12) == "Rejected by Department Head" && !frm.doc.qa_error_comments){
    frm.scroll_to_field("qa_error_comments")
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below Mandatory fields')
    });
    
  }

}
// Operation Manager

if(frappe.user_roles.includes("Operations Manager") || frappe.user_roles.includes("Administrator") || frappe.user_roles.includes('WMS Manager') || frappe.user_roles.includes('Super Admin'))
{
  const cerqtf = frm.doc.workflow_state.slice(56)
  const cseclevapp = frm.doc.workflow_state.slice(38)

  if((frm.doc.accept_coder_error_by_operations_manager_two == "Yes" || frm.doc.accept_coder_error_by_operations_manager_two == "No") && cerqtf == "supervisor" && !frm.doc.op_manager_comments){
    frm.scroll_to_field("op_manager_comments")
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below Mandatory fields')
    });
   ;
  }
  else if((frm.doc.accept_coder_by_operation_manager == "Yes" || frm.doc.accept_coder_by_operation_manager == "No") && cseclevapp == "Appeal" && !frm.doc.op_manager_comments_two){
    frm.scroll_to_field("op_manager_comments_two")
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below Mandatory fields')
    });
    
  }
}
// Operation Manager Ends

// QA Manager
if(frappe.user_roles.includes("QA Manager") || frappe.user_roles.includes( "Administrator")|| frappe.user_roles.includes('WMS Manager') || frappe.user_roles.includes('Super Admin'))
{
  const qacerl2 = frm.doc.workflow_state.slice(71);  

  if((frm.doc.accept_qa_error_by_qa_manager == "Yes" || frm.doc.accept_qa_error_by_qa_manager == "No") && qacerl2 == "Appeal" && !frm.doc.qam_comments){
    frm.scroll_to_field("qam_comments")
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below Mandatory fields')
    });
   
  }

  const qmsec =  frm.doc.workflow_state.slice(70);

  if((frm.doc.accept_qa_error_by_qa_manager == "Yes" || frm.doc.accept_qa_error_by_qa_manager == "No") && qmsec == "Appeal" && !frm.doc.qam_comments){
    frm.scroll_to_field("qam_comments")
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below Mandatory fields')
    });
  }

  const qaappeal = frm.doc.workflow_state.slice(23);

  if((frm.doc.accept_qa_error_by_qa_manager == "Yes" || frm.doc.accept_qa_error_by_qa_manager == "No") && qaappeal == "Appeal" && !frm.doc.qam_comments){
    frm.scroll_to_field("qam_comments")
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below Mandatory fields')
    });
   
  }    
}
// QA Manager Ends

// Dept Head
if(frappe.user_roles.includes("Department Head") || frappe.user_roles.includes("Administrator")|| frappe.user_roles.includes('WMS Manager') || frappe.user_roles.includes('Super Admin'))
{
  const qerqm = frm.doc.workflow_state.slice(49)

  if((frm.doc.accept_coder_error_by_dept_head == "Coder Error" || frm.doc.accept_coder_error_by_dept_head == "QA Error") && qerqm == "Manager" && !frm.doc.dept_head_comments){
    frm.scroll_to_field("dept_head_comments")
    frappe.throw({
      title: __('Warning'),
      indicator: 'red',
      message: __('Enter the below Mandatory fields')
    });
   ;
  }
}
// Dept Head Ends
}

function child_table_copy_validation(frm){
// on paste

// on medical coder side
frm.get_field("sticky_notes_table").$wrapper.on('paste', ':text', e => {  
          let pasted_data = frappe.utils.get_clipboard_data(e);
          let data = frappe.utils.csv_to_array(pasted_data, '\t');
          let length = frm.doc.sticky_notes_table.length
          let check_undefined = []
          let table = frm.doc.sticky_notes_table
          
          var arr = []
          if(length > 1){
            for (let key in table){
              check_undefined.push(table[key].first_diagnostics)
              if (table[key].first_diagnostics != undefined){
                arr.push(table[key].first_diagnostics.trim().toLowerCase())
              }
              if (table[key].first_diagnostics == ""){
                cur_frm.get_field("sticky_notes_table").grid.grid_rows[key].remove();
              }
            }
            check_undefined.pop()
          }
          
          for (let i in data){
            arr.push(data[i][0].trim().toLowerCase())
          }
          check_duplicates(arr,check_undefined.includes(undefined))
  })
// on qa side
frm.get_field("icd_codeqa").$wrapper.on('paste', ':text', e => { 
      let pasted_data = frappe.utils.get_clipboard_data(e);
      let data = frappe.utils.csv_to_array(pasted_data, '\t');
      let length = frm.doc.icd_codeqa.length
      let table = frm.doc.icd_codeqa
      let check_undefined = []
      var arr = []
          if(length > 1){
            for (let key in table){
              check_undefined.push(table[key].icd_qa)
              if (table[key].icd_qa != undefined){
              arr.push(table[key].icd_qa.trim().toLowerCase())
              }
            }
            check_undefined.pop()
          }
          
          for (let i in data){
            arr.push(data[i][0].trim().toLowerCase())
          }
      check_duplicates(arr,check_undefined.includes(undefined))

})
}

// for medical coder side
// function special_case_mitem_rules(frm){
//   var data = []
//   if (frm.doc.oasis_item){
//       frm.doc.oasis_item.map((d)=>{
//           if(d.oasis_items != undefined){
//               if(d.oasis_items.trim() == "M1306" && d.redroad_response.trim() == "0-No"){
//                   data.push("M1311A1", "M1311B1", "M1311C1", "M1311D1", "M1311E1", "M1311F1")
//               }

//               // mitem rule 15(no) -- M1322 and M1334 exclude
//               // mitem rule 18(no) -- M1322 and M1334 exclude
//               if (d.oasis_items.trim() == "M1330" && d.redroad_response.trim() == "0-No"){
//                 data.push("M1332","M1334")  
//               }

//               var m1330_1 = ["3-Yes, patient has unobservable stasis ulcers ONLY (known but not observable due to nonremovable dressing/device)"]
//               if (d.oasis_items.trim() == "M1330" && m1330_1.includes(d.redroad_response.trim())){
//                 data.push("M1322","M1334")
//               }

//               // mitem rule 19(no) -- M1342 exclude
//               // mitem rule 21(no) -- M1342 exclude
//               if (d.oasis_items.trim() == "M1340" && (d.redroad_response.trim() == "0-No" || d.redroad_response.trim() == "2-Surgical wound known but not observable due to non-removable dressing/device")){
//                 data.push("M1342")  
//               }
            
//               if (["GG0170 Q1 -  (SOC/ROC Perf)"].includes(d.oasis_items.trim()) && d.redroad_response.split("→")[0].trim() == "0. No"){
//                   data.push("GG0170 Q2 - Discharge Goal","GG0170 R2 - Discharge Goal","GG0170 R1 -  (SOC/ROC Perf)","GG0170 RR1","GG0170 S1 -  (SOC/ROC Perf)","GG0170 SS1","GG0170 S2 - Discharge Goal")  
//               }
//               if (["GG0170 Q2 - Discharge Goal"].includes(d.oasis_items.trim()) && d.redroad_response.split("→")[0].trim() == "0. No"){
//                   data.push("GG0170 Q1 -  (SOC/ROC Perf)","GG0170 R2 - Discharge Goal","GG0170 R1 -  (SOC/ROC Perf)","GG0170 RR1","GG0170 S1 -  (SOC/ROC Perf)","GG0170 SS1","GG0170 S2 - Discharge Goal")
//               }                                                               



//               if(d.oasis_items.trim() == "M1005[Date Unknown]" && d.redroad_response.trim() == "Yes"){
//                   data.push("M1005[Date Known]")
//               }
//           }
//       })
//   }

//   var set = new Set(data);
//   const array = [...set];  
//   return  array
// }

// for qa side
// function special_case_mitem_rules_qa_side(frm){
//   var data = []
//   if (frm.doc.qa_table){
//       frm.doc.qa_table.map((d)=>{
//           if (d.qa_mitem != undefined){
//               // mitem rule 11(no) -- "M1311A1", "M1311B1", "M1311C1", "M1311D1", "M1311E1", "M1311F1" exclude
//               if(d.qa_mitem.trim() == "M1306" && d.red_road_qa_response.trim() == "0-No"){
//                 data.push("M1311A1", "M1311B1", "M1311C1", "M1311D1", "M1311E1", "M1311F1")
//               }

//               // mitem rule 15(no) -- M1322 and M1334 exclude
//               // mitem rule 18(no) -- M1322 and M1334 exclude
//               if (d.qa_mitem.trim() == "M1330" && d.red_road_qa_response.trim() == "0-No"){
//                 data.push("M1332","M1334")  
//               }

//               var m1330_1 = ["3-Yes, patient has unobservable stasis ulcers ONLY (known but not observable due to nonremovable dressing/device)"]
//               if (d.qa_mitem.trim() == "M1330" && m1330_1.includes(d.red_road_qa_response.trim())){
//                 data.push("M1322","M1334")
//               }

//               // mitem rule 19(no) -- M1342 exclude
//               // mitem rule 21(no) -- M1342 exclude
//               if (d.qa_mitem.trim() == "M1340" && (d.red_road_qa_response.trim() == "0-No" || d.red_road_qa_response.trim() == "2-Surgical wound known but not observable due to non-removable dressing/device")){
//                 data.push("M1342")
//               }

//               if (["GG0170 Q1 -  (SOC/ROC Perf)"].includes(d.qa_mitem.trim()) && d.red_road_qa_response.split("→")[0].trim() == "0. No"){
//                 data.push("GG0170 Q2 - Discharge Goal","GG0170 R2 - Discharge Goal","GG0170 R1 -  (SOC/ROC Perf)","GG0170 RR1","GG0170 S1 -  (SOC/ROC Perf)","GG0170 SS1","GG0170 S2 - Discharge Goal")
//               }
//               if (["GG0170 Q2 - Discharge Goal"].includes(d.qa_mitem.trim()) && d.red_road_qa_response.split("→")[0].trim() == "0. No"){
//                 data.push("GG0170 Q1 -  (SOC/ROC Perf)","GG0170 R2 - Discharge Goal","GG0170 R1 -  (SOC/ROC Perf)","GG0170 RR1","GG0170 S1 -  (SOC/ROC Perf)","GG0170 SS1","GG0170 S2 - Discharge Goal")
//               }
              
              
//               if(d.qa_mitem.trim() == "M1005[Date Unknown]" && d.red_road_qa_response.trim() == "Yes"){
//                   data.push("M1005[Date Known]")
//               }
//           }
//       })
//   }
//   var set = new Set(data);
//   const array = [...set];
//   return  array
// }


// medical coder side child table event
function check_oasis_child_table(frm){
  if (frm.doc.oasis_item && frm.doc.oasis_item.length > 0){
      var flag_m1322_no = false
      var flag_m1322_yes = false
      var m1322_data = []

      var M1331A1_C1_M1322 = ["M1311A1", "M1311B1", "M1311C1","M1322"]
      var M1331A1_C1_M1322_flag = false
      var m1330_flag = false
      var m1005_no_flag = false
      var m1340_flag = false
      var mitem_name = ""
      
      var gg0170_q1 = [
                      "GG0170 R1 -  (SOC/ROC Perf)",
                      "GG0170 R2 - Discharge Goal",
                      "GG0170 RR1",
                      "GG0170 S1 -  (SOC/ROC Perf)",
                      "GG0170 S2 - Discharge Goal",
                      "GG0170 SS1",
                      "GG0170 Q1 -  (SOC/ROC Perf)"
                    ]

      var gg0170_q1_flag = false

      var data = []
      frm.doc.oasis_item.map((item) => {
          data.push(item.oasis_items.trim())
          if (item.oasis_items != undefined){
              // / mitem rules 12(no) --M1322
              if (item.oasis_items.trim() == "M1306" && item.redroad_response.trim() == "0-No"){
                  flag_m1322_no = true  
              }

              // / mitem rules 13(no) --"M1311A1", "M1311B1", "M1311C1", "M1311D1", "M1311E1", "M1311F1"
              if (item.oasis_items.trim() == "M1306" && item.redroad_response.trim() == "1-Yes"){
                  m1322_data = ["M1311A1", "M1311B1", "M1311C1", "M1311D1", "M1311E1", "M1311F1"]
                  flag_m1322_yes = true
              }

              // mitem rules 14(no) --M1324
              if (M1331A1_C1_M1322.includes(item.oasis_items.trim())){
                  M1331A1_C1_M1322_flag = true
              }

              //  mitem rules 17(no) -- M1332 / M1334 mandatory
              var m1330_data = ["1-Yes, patient has BOTH observable and unobservable stasis ulcers","2-Yes, patient has observable stasis ulcers ONLY"]
              if (item.oasis_items.trim() == "M1330" && m1330_data.includes(item.redroad_response.trim())){
                m1330_flag = true

              }
              
              // mitem rules 20(no) -- M1342 mandatory
              var m1340_data = ["1-Yes, patient has at least one observable surgical wound"]
              if (item.oasis_items.trim() == "M1340" && m1340_data.includes(item.redroad_response.trim())){
                m1340_flag = true

              }

              // mitem rules 23(no) -- one of "GG0170Q2","GG0170R","GG0170RR1","GG0170S","GG0170SS1 mandatory
              if (["GG0170 Q1 -  (SOC/ROC Perf)"].includes(item.oasis_items.trim()) && item.redroad_response.split("→")[0].trim() == "1. Yes"){
                  gg0170_q1_flag = true
                  gg0170_q1.pop()
                  gg0170_q1.push("GG0170 Q2 - Discharge Goal")
                  mitem_name = "GG0170 Q1 -  (SOC/ROC Perf)"

              }

              if (["GG0170 Q2 - Discharge Goal"].includes(item.oasis_items.trim()) && item.redroad_response.split("→")[0].trim() == "1. Yes"){
                  gg0170_q1_flag = true
                  mitem_name = "GG0170 Q2 - Discharge Goal"
              }

              // mitems rules m1105 M1005[Date Known] manadatory
              if(item.oasis_items.trim() == "M1005[Date Unknown]" && item.redroad_response.trim() == "No"){
                  m1005_no_flag = true
              }
          }
      })

      check_m1306_condition(data,flag_m1322_no,flag_m1322_yes,m1322_data)
      check_m1330_condition(data,m1330_flag)
      check_m1340_condition(data,m1340_flag)
      check_m1324_condition(data,M1331A1_C1_M1322_flag,M1331A1_C1_M1322)
      check_gg0170_q1_condition(data,gg0170_q1_flag,gg0170_q1,mitem_name)
      check_m1005_no_conditon(data,m1005_no_flag)
  }
}

// function check_oasis_validation(frm,cdt,cdn) {
//   if ((frm.is_new()) || 
//     ["Draft"].includes(frm.doc.workflow_state) ||
//     (frm.doc.workflow_state == "Error Marked By QA" && frm.doc.coder_accept_error_from_qa == "Yes") ||
//     (frm.doc.workflow_state == "QA Error Accepted by QA TL" && frm.doc.accept_error_from_qa_lead == "Yes") ||
//     (frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal" && frm.doc.error_based_on_feedback_received2 == "Yes") ||
//     (frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback" && frm.doc.accept_error_two == "Yes") ||
//     (frm.doc.workflow_state == "Pending Quality" && frm.doc.error_marked == "Yes")
//     ) {
//     if (frm.doc.oasis_item && frm.doc.oasis_item.length > 0) { 
//           var d = locals[cdt][cdn] 
//           frappe.call({
//             method: 'wms.wms.doctype.medical_coder_flow.medical_coder_flow.check_oasis_item',
//             args: {
//                 name: frm.doc.name,
//                 child: frm.doc.oasis_item,
//                 payor_type: d.payor_type,
//                 assessment_type: d.assessment_type

//             },

//             freeze: true,
//             callback: (r) => {
//               if(r && r.message){
//                 if (r && r.message[0] != "Exclude" && r.message[1].length > 1) {
//                   frappe.msgprint({
//                     title: __('Warning'),
//                     indicator: 'orange',
//                     message: __(r.message[0] + ' is present so responses for one of the <b>'+ r.message[1] + '</b> are mandatory')
//                     });
//                     frappe.validated = false;
//                 }
//                 if (r && r.message[0] != "Exclude" && r.message[1].length == 1) {
//                   frappe.msgprint({
//                     title: __('Warning'),
//                     indicator: 'orange',
//                     message: __(r.message[0] + ' is present so responses for <b>'+ r.message[1] + '</b> is mandatory')
//                     });
//                     frappe.validated = false;

//                 }
//                 if (r.message[0] == "Exclude") {
//                   frappe.msgprint({
//                     title: __('Warning'),
//                     indicator: 'orange',
//                     message: __(r.message[1] + ' is present so responses for <b>'+ r.message[2] + '</b> should not be present')
//                     });
//                     frappe.validated = false;
//                 }
//                 }
                
//                 },
//               error: (r) => {
//               // on error
//             }
//         })
//       }
//     }
// }

function set_filtered_mitems(frm) {
// if (frm.doc.oasis_item && frm.doc.oasis_item.length > 0) { 
  frappe.call({
    method: 'wms.wms.doctype.medical_coder_flow.medical_coder_flow.set_filtered_mitems',
    args: {
      name: frm.doc.name,
      child: frm.doc.oasis_item,
  },
    freeze: true,
    callback: (r) => {
        if (r && r.message){
          frm.set_query("mitems", function(){
            // var array = special_case_mitem_rules(frm)
            return {
                "filters":[
                    ["payortype", "=", frm.doc.mitem_payortype],
                    ["assessment_type" ,"=", frm.doc.assessment_type],
                    ["naming","=", frm.doc.testing_mid],
                    [ "mitems", "NOT IN", r.message],
                ] 
            };    
        })
        }

    },
    error: (r) => {
        // on error
    }
})

// }
}



// qa side child table child table event
function  check_qa_mitems_child_table(frm){
if (frm.doc.qa_table && frm.doc.qa_table.length > 0){

  var flag_m1322_no = false
  var flag_m1322_yes = false
  var m1322_data = []

  var m1005_no_flag = false

  var M1331A1_C1_M1322 = ["M1311A1", "M1311B1", "M1311C1","M1322"]
  var M1331A1_C1_M1322_flag = false

  var m1330_flag = false

  var m1340_flag = false

  var gg0170_q1 = [
                  "GG0170 R1 -  (SOC/ROC Perf)",
                  "GG0170 R2 - Discharge Goal",
                  "GG0170 RR1",
                  "GG0170 S1 -  (SOC/ROC Perf)",
                  "GG0170 S2 - Discharge Goal",
                  "GG0170 SS1",
                  "GG0170 Q1 -  (SOC/ROC Perf)"
                  ]
                  
  var gg0170_q1_flag = false
  var mitem_name = ""


  var data = []



  frm.doc.qa_table.map((item) => {
    if(item.qa_mitem != undefined){
            data.push(item.qa_mitem.trim())
            
            // ----------------------M1306-----------------------
            if (item.qa_mitem.trim() == "M1306" && item.red_road_qa_response.trim() == "0-No"){
              flag_m1322_no = true  
            }
            if (item.qa_mitem.trim() == "M1306" && item.red_road_qa_response.trim() == "1-Yes"){
              m1322_data = ["M1311A1", "M1311B1", "M1311C1", "M1311D1", "M1311E1", "M1311F1"]
              flag_m1322_yes = true

            }
            // mitem rules 14(no) --M1324
            if (M1331A1_C1_M1322.includes(item.qa_mitem.trim())){
              M1331A1_C1_M1322_flag = true
            }

            // mitem rules 17(no) -- M1332 / M1334 mandatory
            var m1330_data = ["1-Yes, patient has BOTH observable and unobservable stasis ulcers","2-Yes, patient has observable stasis ulcers ONLY"]
            if (item.qa_mitem.trim() == "M1330" && m1330_data.includes(item.red_road_qa_response.trim())){
              m1330_flag = true
            }
            // mitem rules 20(no) -- M1342 mandatory
            var m1340_data = ["1-Yes, patient has at least one observable surgical wound"]
            if (item.qa_mitem.trim() == "M1340" && m1340_data.includes(item.red_road_qa_response.trim())){
              m1340_flag = true

            }


            // mitem rules 23(no) -- one of "GG0170Q2","GG0170R","GG0170RR1","GG0170S","GG0170SS1 mandatory
            if (["GG0170 Q1 -  (SOC/ROC Perf)"].includes(item.qa_mitem.trim())  && item.red_road_qa_response.split("→")[0].trim() == "1. Yes"){
                gg0170_q1_flag = true
                gg0170_q1.pop()
                gg0170_q1.push("GG0170 Q2 - Discharge Goal")
                mitem_name = "GG0170 Q1 -  (SOC/ROC Perf)"
            }
            if (["GG0170 Q2 - Discharge Goal"].includes(item.qa_mitem.trim())  && item.red_road_qa_response.split("→")[0].trim() == "1. Yes"){
                gg0170_q1_flag = true
                mitem_name = "GG0170 Q2 - Discharge Goal"
            }
            

            // mitems rules m1105 M1005[Date Known] manadatory
            if(item.qa_mitem.trim() == "M1005[Date Unknown]" && item.red_road_qa_response.trim() == "No"){
              m1005_no_flag = true
            }

        }
  })
        

          check_m1306_condition(data,flag_m1322_no,flag_m1322_yes,m1322_data)
          check_m1324_condition(data,M1331A1_C1_M1322_flag,M1331A1_C1_M1322)
          check_m1330_condition(data,m1330_flag)
          check_m1340_condition(data,m1340_flag)
          check_gg0170_q1_condition(data,gg0170_q1_flag,gg0170_q1,mitem_name)
          check_m1005_no_conditon(data,m1005_no_flag)
  }


}

const check_m1005_no_conditon = (data,m1005_no_flag)=>{
if(m1005_no_flag && !data.includes("M1005[Date Known]")){
  frappe.msgprint({
    title: __('Warning'),
    indicator: 'orange',
    message: __(`M1005[Date Unknown] is present and response is No <b>M1005[Date Known]</b> mandatory`)
  });
  frappe.validated = false;

} 
}

function check_m1330_condition(data,m1330_flag){
if (m1330_flag && !(data.includes("M1332") && data.includes("M1334"))){
  frappe.msgprint({
    title: __('Warning'),
    indicator: 'orange',
    message: __(`<b>M1330</b> is present <b>M1332 and M1334</b>  mandatory`)
  });
  frappe.validated = false;
}
}

function check_m1340_condition(data,m1340_flag){
if (m1340_flag && !data.includes("M1342")){
  frappe.msgprint({
    title: __('Warning'),
    indicator: 'orange',
    message: __(`<b>M1340</b> is present <b>M1342</b>  mandatory`)
  });
  frappe.validated = false;
}
}

function check_m1306_condition(data,flag_m1322_no,flag_m1322_yes,m1322_data){
  if (flag_m1322_no && !data.includes("M1322")){
      frappe.msgprint({
          title: __('Warning'),
          indicator: 'orange',
          message: __(`M1306 is present <b>M1322</b> mandatory`)
      });
      frappe.validated = false;
  }

  // ---------------check include-------------------
  if (flag_m1322_yes){
      var flag = false
      for (let i in data){
          if (m1322_data.includes(data[i])){
              flag = true
              break
          }
      }
      if (!flag){
          frappe.msgprint({
              title: __('Warning'),
              indicator: 'orange',
              message: __(`<b>M1306</b> is present and response is 1-yes please add one of them <b>${m1322_data}</b>`)
          });
          frappe.validated = false;
      }
  }
}

function check_m1324_condition(data,M1331A1_C1_M1322_flag,M1331A1_C1_M1322){
  if (M1331A1_C1_M1322_flag && !data.includes("M1324")){
      frappe.msgprint({
          title: __('Warning'),
          indicator: 'orange',
          message: __(`One of <b>${M1331A1_C1_M1322}</b> is present <b>M1324</b>  mandatory`)
      });
      frappe.validated = false;
  }
}

function check_gg0170_q1_condition(data,gg0170_q1_flag,gg0170_q1,mitem_name){
  if(gg0170_q1_flag){
      var flag = false
      for (let i in data){
          if (gg0170_q1.includes(data[i])){
              flag = true
              break
          }
      }

      if (!flag){
          frappe.msgprint({
              title: __('Warning'),
              indicator: 'orange',
              message: __(`<b>${mitem_name}</b> is present and response is 1-yes please add one of them <b>${gg0170_q1}</b>`)
          });
          frappe.validated = false;
      }
  }
}

// O series Combiation
const setup_rt_mitems = (frm)=>{
  frm.set_query("rt_mitems",function(doc){
      if(doc.mitem == "O0110" && doc.cancer_treatments == "1"){
          return {
              "filters": [
                ["MItems Multiple Values",'multiple_values',"in", ["O0110A1. Chemotherapy","O0110A2. IV","O0110A3. Oral",
                "O0110A10. Other", "O0110B1. Radiation"]]
              ]
          }
      }
  });
}

const setup_ct_mitems = (frm)=>{
  frm.set_query("ct_mitems",function(doc){
      if(doc.mitem == "O0110" && doc.other == "1"){
          return {
              "filters": [
                  ["MItems Multiple Values",'multiple_values',"in", ["O0110H1. IV Medications","O0110H2. Vasoactive medications","O0110H3. Antibiotics",
                      "O0110H4. Anticoagulation", "O0110H10. Other", "O0110I1. B96Transfusions", "O0110J1. Dialysis", "O0110J2. Hemodialysis","O0110J3. Peritoneal dialysis", "O0110O1. IV Access", "O0110O2. Peripheral", "O0110O3. Mid-line", "O0110O4. Central (e.g., PICC, tunneled, port)"]]
              ]
          }
      }
  });
}

const setup_none_mitems = (frm)=>{
  frm.set_query("none_mitems",function(doc){
      if(doc.mitem == "O0110" && doc.respiratory_therapies == "1"){
          return {
              "filters": [
                  ["MItems Multiple Values",'multiple_values',"in", ["O0110C1. Oxygen Therapy","O0110C2. Continuous","O0110C3. Intermittent", "O0110C4. High-concentration", "O0110D1. Suctioning", "O0110D2. Scheduled", "O0110D3. As Needed", "O0110E1. Tracheostomy care", "O0110F1. Invasive Mechanical Ventilator (ventilator or respirator)", "O0110G1. Non-invasive Mechanical Ventilator", "O0110G2. BiPAP", "O0110G3. CPAP"]]
              ]
          }
      }
  });
}

const setup_ot_mitems = (frm)=>{
  frm.set_query("ot_mitems",function(doc){
      if(doc.mitem == "O0110" && doc.none_of_the_above == "1"){
          return {
              "filters": [
                  ["MItems Multiple Values",'multiple_values',"in", ["O0110Z1. None of the Above"]]
              ]
          }
      }
  });
}

const setup_qact_mitems = (frm)=>{
  frm.set_query("qact_mitems",function(doc){
      if(doc.qa_mitem == "O0110" && doc.qact == "1"){
          return {
              "filters": [
                  ["MItems Multiple Values",'multiple_values',"in", ["O0110A1. Chemotherapy","O0110A2. IV","O0110A3. Oral", "O0110A10. Other", "O0110B1. Radiation"]]
              ]
          }
      }
  });
}

const setup_qaot_mitems = (frm)=>{
  frm.set_query("qaot_mitems",function(doc){
      if(doc.qa_mitem == "O0110" && doc.qaot == "1"){
          return {
              "filters": [
                  ["MItems Multiple Values",'multiple_values',"in", ["O0110H1. IV Medications","O0110H2. Vasoactive medications","O0110H3. Antibiotics",     "O0110H4. Anticoagulation", "O0110H10. Other", "O0110I1. B96Transfusions", "O0110J1. Dialysis", "O0110J2. Hemodialysis", "O0110J3. Peritoneal dialysis", "O0110O1. IV Access", "O0110O2. Peripheral", "O0110O3. Mid-line", "O0110O4. Central (e.g., PICC, tunneled, port)"]]
              ]
          }
      }
  });

}

const setup_qart_mitems = (frm)=>{
  frm.set_query("qart_mitems",function(doc){
      if(doc.qa_mitem == "O0110" && doc.qart == "1"){
          return {
              "filters": [
                  ["MItems Multiple Values",'multiple_values',"in", ["O0110C1. Oxygen Therapy","O0110C2. Continuous","O0110C3. Intermittent",
                  "O0110C4. High-concentration", "O0110D1. Suctioning", "O0110D2. Scheduled", "O0110D3. As Needed", "O0110E1. Tracheostomy care",
                   "O0110F1. Invasive Mechanical Ventilator (ventilator or respirator)", "O0110G1. Non-invasive Mechanical Ventilator", "O0110G2. BiPAP", "O0110G3. CPAP"]]
              ]
          }
      }
  });
}

const setup_qanone_mitems = (frm)=>{
  frm.set_query("qanone_mitems",function(doc){
      if(doc.qa_mitem == "O0110" && doc.qanone == "1"){
          return {
              "filters": [
                  ["MItems Multiple Values",'multiple_values',"in", ["O0110Z1. None of the Above"]]
              ]
          }
      }
  });
}

// This function is not working V14 so a new function was written instead of this. Refer display_serial_numbers_in_icd_code function

// function show_serial_number_in_icd_code(frm){  
//   $('.grid-row > .row .col, .form-section .grid-row > .section-body .col, .form-dashboard-section .grid-row > .section-body .col, .grid-row > .dialog-assignment-row .col').show()
// }

function display_serial_numbers_in_icd_code(){
setTimeout(function() {
  $('.form-column.col-sm-6 .form-grid .row-index, .form-column.col-sm-4 .form-grid .row-index')
    .show()
},0);
}
  


function three_dot_menu(frm){  
  if (!["Production Inventory Allocation" ,"HR Manager"].includes(frappe.boot.wms.role_profile)){
      remove_assign_to_menu(frm);
  }	
}

function remove_assign_to_menu(frm){
  var three_dot_menu = frm.page.menu
  three_dot_menu.children().each(function() {
      var rename_button = $(this);
      var buttonText = rename_button.text().trim();
      var button = rename_button.text().replace(/^\s+|\s+$/gm,'').split('\n')[0];
      var menu_options = ["Jump to field","Copy to Clipboard","Repeat","Links","Duplicate","Email"]

      if (menu_options.includes(button)) {
          rename_button.remove();
      }
  })
}

frappe.ui.form.on("Secondary Diagnostics",{
first_diagnostics : function (frm,cdt, cdn) {
var score = locals[cdt][cdn];
score.first_diagnostics =  score.first_diagnostics.replace(/^\s+|\s+$/gm,'').toUpperCase();

if (score.first_diagnostics.length === 0) {
  cur_frm.get_field("sticky_notes_table").grid.grid_rows[score.idx-1].remove(); 
}

if (!score.first_diagnostics) {
  return;
}

// Check if the length is between 3 and 8 characters
if (score.first_diagnostics.length < 3 || score.first_diagnostics.length > 8) {
    frappe.show_alert({
        message: __('ICD codes in sticky notes should be between 3 and 8 characters'),
        indicator: 'orange'
    }, 8);
}

// Check if it starts with an alphabet
if (!/^[a-zA-Z]/.test(score.first_diagnostics)) {
    frappe.show_alert({
        message: __('ICD codes in sticky notes should start with an alphabet'),
        indicator: 'orange'
    }, 8);
    return;
}

// Check for alphanumeric characters
var regex = /[^a-zA-Z0-9.-]+/g;

if (regex.test(score.first_diagnostics)) {
    frappe.show_alert({
        message: __("ICD codes in sticky notes: Only Alphanumeric characters are allowed."),
        indicator: 'orange'
    }, 8);
    return;
}

},
sticky_notes_table_add: function(frm) {
  $('.form-column.col-sm-6 .form-grid .row-index').show()
},
sticky_notes_table_move: function(frm) {
  $('.form-column.col-sm-6 .form-grid .row-index').show()
},
before_sticky_notes_table_remove: function(frm) {
  setTimeout(function() {
  $('.form-column.col-sm-6 .form-grid .row-index').show()
}, 100); 
}
})


// Child table ICD Code QA

frappe.ui.form.on("ICD Code QA",{
form_render:function(frm,cdt,cdn){ 
  $(`.grid-delete-row`).remove();
  var mc_icd = locals[cdt][cdn];
  var icd_code = frm.doc.icd_code.map(function(ele) {
      return ele.icd;
  });
  if (icd_code.includes(mc_icd.icd_qa)) {
    $(`[data-fieldname="icd_qa"]`).attr("readonly",1);
  }
},

icd_qa : function (frm,cdt, cdn) {
  // show_serial_number_in_icd_code(frm)
  var score = locals[cdt][cdn]
  score.icd_qa = $.trim(score.icd_qa).toUpperCase()

  make_icd_codeqa_comments_required(score,frm)
  if (score.icd_qa.length === 0) {
    cur_frm.get_field("icd_codeqa").grid.grid_rows[score.idx-1].remove(); 
  }
  if (!score.icd_qa) {
    return;
  }
  if (score.icd_qa.length < 3 || score.icd_qa.length > 8) {
        frappe.show_alert({
          message:__('ICD Codes in ICD Code QA should be between 3 and 8 characters'),
          indicator:'orange'
      },8) 

    }
  // Check if it starts with an alphabet
  if (!/^[a-zA-Z]/.test(score.icd_qa)) {
    frappe.show_alert({
        message: __('ICD codes in ICD Code QA should start with an alphabet'),
        indicator: 'orange'
    }, 8);
    return;
  }


  // var regex =/[^a-z A-Z 0-9\.-]+/g;
  var regex =/[^a-zA-Z0-9.-]+/g;
  
  if(regex.test(score.icd_qa)){
    frappe.show_alert({
      message:__("ICD codes Only Alphanumeric characters  are allowed."),
      indicator:'orange'
  },8) 
  }
},
icd_codeqa_add:function(frm,cdt,cdn){

  // $(`[data-fieldname="icd_codeqa"]`).find('button').click(function(){
    // show_serial_number_in_icd_code(frm)
  // }) 
  $('.form-column.col-sm-6 .form-grid .row-index, .form-column.col-sm-4 .form-grid .row-index')
    .show() 
  
},
icd_codeqa_move:function(frm,cdt,cdn){

  var row = locals[cdt][cdn]
  make_icd_codeqa_comments_required(row,frm)
  $('.form-column.col-sm-6 .form-grid .row-index, .form-column.col-sm-4 .form-grid .row-index')
  .show()

},
remove_icd: function(frm, cdt, cdn){
    var row = locals[cdt][cdn]
    if(row.remove_icd=="Delete"){
      only_medical_coder_icd_code(frm,cdt,cdn)
    } else {
        frm.fields_dict['icd_codeqa'].grid.grid_rows_by_docname[row.name].set_field_property("qa_comments","reqd", 0)
        frm.fields_dict['icd_codeqa'].grid.grid_rows_by_docname[row.name].refresh_field('qa_comments')
    }
},

})

// Medical Coder 
frappe.ui.form.on("OASIS Child MItem",{
  oasis_item_remove:function(frm,cdt,cdn){
    combined_mitems(frm);
  },
  form_render:function(frm,cdt,cdn){
    $(".control-input textarea[data-fieldname='redroad_response']").prop('readonly', true);
    $(".control-input textarea[data-fieldname='clinical']").prop('readonly', true);
    $(".control-input textarea[data-fieldname='reason_for_change']").prop('readonly', true);
    $(".control-input textarea[data-fieldname='qa_clinician_response']").prop('readonly', true);
    $(".control-input textarea[data-fieldname='qa_reason_for_change']").prop('readonly', true);
  }
})

// QA
frappe.ui.form.on("QA MItems",{
  qa_table_remove:function(frm,cdt,cdn){
    combined_mitems(frm);
  },
})

const only_medical_coder_icd_code = (frm,cdt,cdn)=>{
  let row = locals[cdt][cdn]
  var name = (row.icd_qa || '').trim();
  const icd_code_data = new Map();
  frm.doc.icd_code.forEach((item)=>{
    icd_code_data.set(item.icd.trim(),true)
  })
  if(icd_code_data.get(name)){
    frm.fields_dict['icd_codeqa'].grid.grid_rows_by_docname[row.name].set_field_property("qa_comments","reqd", 1)
    frm.fields_dict['icd_codeqa'].grid.grid_rows_by_docname[row.name].refresh_field('qa_comments') 
  }
  else{
    frm.fields_dict['icd_codeqa'].grid.grid_rows_by_docname[row.name].set_field_property("qa_comments","reqd", 0)
    frm.fields_dict['icd_codeqa'].grid.grid_rows_by_docname[row.name].refresh_field('qa_comments') 
  }
}

function make_icd_codeqa_comments_required(row,frm){
  frm.fields_dict['icd_codeqa'].grid.grid_rows_by_docname[row.name].set_field_property("qa_comments","reqd",1)
  frm.fields_dict['icd_codeqa'].grid.grid_rows_by_docname[row.name].refresh_field('qa_comments')
  
}

async function waitForValue(frm) {
return new Promise((resolve) => {
  const intervalId = setInterval(() => {
    if (frm.page.actions.children().length) {
      clearInterval(intervalId);
      resolve();
    }
  }, 1000); // Checks every second
});
}

async function remove_assign_to_qa(frm) {
  if (frappe.user_roles.includes('QA Lead') && frm.doc.workflow_state =="Picked for Audit"){
      await waitForValue(frm);
      // Perform the desired action when the value is found
      remove_assign_to(frm,"Assigned to QA")
  }

  if (frappe.user_roles.includes("QA Inventory Allocation") && frm.doc.workflow_state =="Production Completed"){
      await waitForValue(frm);
      remove_assign_to(frm,"Assigned to QA Lead")
  }
}

function remove_assign_to(frm,action){
var actionButtons = frm.page.actions
actionButtons.children().each(function() {
  var actionButton = $(this);
  var buttonText = actionButton.text().trim();
  if (buttonText === action) {
      // Remove the action button
      actionButton.remove();
  }
})

}

function show_tooltip(){

const $select = $('select[data-fieldname="first_clinical"]');
Array.prototype.forEach.call(document.querySelectorAll('select[data-fieldname="first_clinical"] option'), function(opt) {
  opt.title = "";
});
$select
    .on('change', function () {
        var $this = $(this),
            txt = $this.find('option:selected').text().replace(/\s+/g, ' ');
        $this.attr('title', txt);
    })

const $select1 = $('select[data-fieldname="second_redroad"]');
Array.prototype.forEach.call(document.querySelectorAll('select[data-fieldname="first_clinical"] option'), function(opt) {
  opt.title = "";
});
$select1
    .on('change', function () {
        var $this = $(this),
            txt = $this.find('option:selected').text().replace(/\s+/g, ' ');
        $this.attr('title', txt);
    })
}

function value_on_vice_versa(d) {
var field = d.get_field("first").get_value();
var second = d.get_field("second").get_value(); 

var mergedValues = field.concat(second);
var sortedField = field.slice().sort().toString();
var sortedSecond = second.slice().sort().toString();
var valuesNotInOptions = mergedValues.filter(element => !d.fields[4].options.includes(element));

var sameOptionMessage = __("You can't select the same option.");
var notInListMessage = __("Values entered are not present in the list.");

var showAlert = false;
var hideActions = false;
var message = '';

if (sortedField === sortedSecond && valuesNotInOptions.length === 0) {
  showAlert = true;
  hideActions = true;
  message = sameOptionMessage;
} else if (sortedField !== sortedSecond && valuesNotInOptions.length > 0) {
  showAlert = true;
  hideActions = true;
  message = notInListMessage;
}

if (showAlert) {
  frappe.show_alert({
    title: __('Warning'),
    message: message,
    indicator: 'orange'
  }, 2);
}

if (hideActions) {
  d.standard_actions.hide();
} else {
  d.standard_actions.show();
}
}

// Checking the vice-versa condition for the o-series mitems
// function o_series_mitem_validation_not_checked(frm){
// if(frappe.user_roles.includes("QA")){
//   // Clear the o-series mitems once they uncheck it
//   var check_box = ["qact", "qart", "qaot", "qanone"];
//   var fields_check_box = ["qact_mitems", "qart_mitems", "qaot_mitems", "qanone_mitems"];
//   var reason_for_change = ["rs_qact_mitems", "rs_qart_mitems", "rs_qaot_mitems", "rs_qanone_mitems"];

//   const check_for_o_series_mitem = frm.doc.check_for_o_series_mitems || 0;
//   const labelMap = {
//     "qact": "Cancer Treatment",
//     "qart": "Respiratory Therapies",
//     "qaot": "Other",
//     "qanone": "None of the above"
//   };

//   if (check_for_o_series_mitem === 1) {
//     // Check if check_box are not checked
//     if (check_box.every(cb => frm.doc[cb] === 0)) {
//       // First Popup Message
//       const message = __(`Mandatory Fields required in O: Special Treatment, Procedures and Programs`) +
//         `<br><br><b>At least one of the below should be checked:</b>` +
//         `<br><ul>${check_box.map(cb => `<li>${labelMap[cb]}</li>`).join('')}</ul>`;
//       frappe.throw({
//         message: message,
//         indicator: 'red',
//         title: __('Warning')
//       });
//     }
//     let missingFields = [];
//     check_box.forEach((cb, index) => {
//       const fieldReason = fields_check_box[index];
//       const reason = reason_for_change[index];
//       if (frm.doc[cb] === 1 && (!frm.doc[fieldReason] || !frm.doc[reason])) {
//         missingFields.push(`${labelMap[cb]}: Please Fill the Mitems and Reason for change`);
//       }
//     });

//     if (missingFields.length > 0) {
//       // Show the second popup for validation error
//       const message = __(`Mandatory Fields required in O: Special Treatment, Procedures and Programs`) +
//       `<br><br><b>Please Fill the Below Values:</b>` +
//         `<br><br><ul>${missingFields.map(field => `<li>${field}</li>`).join('')}</ul>`;
//       frappe.throw({
//         message: message,
//         indicator: 'red',
//         title: __('Warning')
//       });
//     }  
//   }
// }
// }

// Checking the vice-versa condition for the singlepicklist 
function single_picklist_value(d){

var field = d.get_field("first_clinical") || d.get_field("firstdate") || d.get_field("firstText");
var second = d.get_field("second_redroad") || d.get_field("seconddate") || d.get_field("secondText");

if(field.value === second.value){
  var alerted = localStorage.getItem('alerted') || '';
  if (alerted != 'no') {
    frappe.show_alert(__(`you can't select the same option`));
    localStorage.setItem('alerted','no');
    d.standard_actions.hide()
  }  
}
else{
  localStorage.setItem('alerted','yes')
  d.standard_actions.show()
}
}



// make the fields Read only for the other role except the QA 
function readonly_qa_fields(frm){ 
  var fieldList = ["pdx_qa",
                "pdpc_qa",
                "icd_code_qa",
                "no_of_pages_qa",
                "pdpc_qa_comments",
                "no_of_pages_qa_comments",
                "pdx_qa_comments",
              ]

  var ws = ["Pending Quality" ,
          "QA Error Accept by QA Manager",
          "Coder Error Rejected by Department Head",
          "QA Error Accepted by QA TL"
        ]

  if (["QA","WMS Super User","Super User"].includes(frappe.boot.wms.role_profile)){
      if( (frm.doc.workflow_state == "QA Error Accepted by QA TL" && frm.doc.accept_error_from_qa_lead != "Yes")){
          fieldList.forEach(function(field) {
              $(`[data-fieldname=${field}]`).find(`[type="text"]`).attr("disabled", true); 
              $(`[data-fieldname=${field}] [type="text"]`).prop("readonly", true);          
          })
      }

      if( (frm.doc.workflow_state == "QA Error Accepted by QA TL" && frm.doc.accept_error_from_qa_lead == "Yes") ){
          fieldList.forEach(function(field) {
              $(`[data-fieldname=${field}]`).find(`[type="text"]`).attr("disabled", false);  
              $(`[data-fieldname=${field}] [type="text"]`).prop("readonly", false);  
              frm.toggle_display("qa_weightage_button", 1)
                     
          })
      }

      if(!ws.includes(frm.doc.workflow_state)){      
          fieldList.forEach(function(field) {        
              $(`[data-fieldname=${field}]`).find(`[type="text"]`).attr("disabled", false);   
              $(`[data-fieldname=${field}] [type="text"]`).prop("readonly", false);          
          })
      }

      if(frm.doc.workflow_state == "Pending Quality"){
          fieldList.forEach(function(field) {
              $(`[data-fieldname=${field}]`).find(`[type="text"]`).prop("readonly", false);     
          })
      } 

      if(frm.doc.workflow_state == "Error Marked By QA"){
        fieldList.forEach(function(field) {
            // Disable the fields
            $(`[data-fieldname=${field}] [type="text"]`).attr("disabled", true);
            // Set the fields to readonly
            $(`[data-fieldname=${field}] [type="text"]`).prop("readonly", true);   


        })

      }     
  } else if (!["QA","WMS Super User","Super User"].includes(frappe.boot.wms.role_profile)){
      fieldList.forEach(function(field) {
          // Disable the fields
          $(`[data-fieldname=${field}] [type="text"]`).attr("disabled", true);
          // Set the fields to readonly
          $(`[data-fieldname=${field}] [type="text"]`).prop("readonly", true);   
      })
  }
}

jQuery(document).on("mouseenter", ".grid-static-col[data-fieldname='oasis_items'],.grid-static-col[data-fieldname='questions'],.grid-static-col[data-fieldname='clinical'],.grid-static-col[data-fieldname='redroad_response'],.grid-static-col[data-fieldname='reason_for_change'],.grid-static-col[data-fieldname='qa_mitem'],.grid-static-col[data-fieldname='red_road_qa_response']", function(e){
  const $target =  $(e.currentTarget).find('.static-area')
  $(e.currentTarget).attr('title',$target.text())
});



async function check_qa_weightage_submited(frm) {
if(frm.doc.error_marked == "Yes" && frappe.user_roles.includes("QA")){
  return new Promise((resolve, reject) => {
      frappe.call({
          method: "wms.wms.doctype.medical_coder_flow.medical_coder_flow.get_cancelled_qa_weightage",
          args: {
            name: frm.doc.name,
          },
          async: false,
          callback: function (r) {
            if (r.message === 0 || r.message === 2 || JSON.stringify(r) === "{}") {
              reject('At least one <b>QA Weightage</b> form should be submitted');
            } else {
              resolve(r.message);
            }
          }
      });
  });
}
}

// Preventing users to see other users responser before taking the workflow Action
function hide_response_before_workflow_action(frm){
if(!frappe.user_roles.includes('Department Head') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
  if(frm.doc.workflow_state == "Department Head Review - QA Error Rejected by QA Manager"){
    frm.toggle_display(["dept_head_comments"],0)
  }

}

if(!frappe.user_roles.includes('QA Manager') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
  if(['QA Manager Review - QA Appeal','QA Manager Review - Coder Error Rejected by L2 Supervisor - 2nd Level Appeal','QA Manager Review - Coder Error Rejected  by L2 supervisor - 1st Level Appeal'].includes(frm.doc.workflow_state)){
    frm.toggle_display(["qam_comments"],0)
  }

}

if(!frappe.user_roles.includes('Operations Manager') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
  if(frm.doc.workflow_state == "Operations Manager Review - Coder Error Rejected  by L1 supervisor"){
    frm.toggle_display(["op_manager_comments"],0)
  }

  if(frm.doc.workflow_state == "Operations Manager Review - 2nd Level Appeal"){
    frm.toggle_display(["op_manager_comments_two"],0)
  }

}

if(!frappe.user_roles.includes('QA Lead') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
  if(frm.doc.workflow_state == "Coder Error Rejected by L1 supervisor - 1st Level Appeal"){
    frm.toggle_display(["qal_comments"],0)
  }

}

if(!frappe.user_roles.includes('QA') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
  if(frm.doc.workflow_state == "QA Error Accepted by QA TL"){
    frm.toggle_display(["qa_error_comment"],0)
  }

  if(["QA Error Accepted by QA Manager","Coder Error Rejected by Department Head"].includes(frm.doc.workflow_state)){
    frm.toggle_display(["qa_error_comments"],0)
  }

}

if(!frappe.user_roles.includes('Medical Coder') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
  if(frm.doc.workflow_state == "Error Marked By QA"){
    frm.toggle_display(["medical_coder_comments"],0)
  }

  if(["Coder Error Accepted  by L2 supervisor - 1st Level Appeal","Coder Error Accepted by Department Head","Coder Error Accepted by L2 Supervisor - 2nd Level Appeal"].includes(frm.doc.workflow_state)){
    frm.toggle_display(["coder_error_comments"],0)
  }

  if(frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal"){
    frm.toggle_display(["medical_coder_comment3"],0)
  }

  if(frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback"){
    frm.toggle_display(["medical_coder_comments_two"],0)
  }
  

}

if(!frappe.user_roles.includes('Production TL') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
  if(frm.doc.workflow_state == "Coder 1st Level Appeal"){
    frm.toggle_display(["team_lead_comments"],0)
  }

  if(frm.doc.workflow_state == "QA Error Rejected  by QA TL"){
    frm.toggle_display(["team_lead_comments_by_qal_feedback"],0)
  }

}
if(frappe.user_roles.includes('Medical Coder') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
  if(frm.doc.workflow_state == "QA Error Rejected  by QA TL"){
    frm.toggle_display(["coder_accept_error"],0)
  }

  if(frm.doc.workflow_state == "Pending Quality"){
    frm.toggle_display(["coder_accept_error_by_qa"],0)
  }

  if(frm.doc.workflow_state == "Coder 1st Level Appeal"){
    frm.toggle_display(["section_break_6"],0)
  }

  if(["Operations Manager Review - 2nd Level Appeal","Operations Manager Review - Coder Error Rejected  by L1 supervisor","Department Head Review - QA Error Rejected by QA Manager"].includes(frm.doc.workflow_state)){
    frm.toggle_display("coder_error_comments",0);
  }
}
if(frappe.user_roles.includes('QA') && frappe.session.user != "Administrator" && !frappe.user_roles.includes('WMS Manager') && !frappe.user_roles.includes('Super Admin')){
  if(frm.doc.workflow_state == "Coder Error Rejected by L1 supervisor - 1st Level Appeal"){
    frm.toggle_display(["accept_error_by_qal"],0)
  }
}
}


const disable_email_button = ()=>{
if (!["Administrator","WMS Super User"].includes(frappe.boot.wms.role_profile)){
  $(`.btn-secondary-dark`).prop('disabled', true)   
  }
}


// function toggleCheckboxAndLabelMC(frm) {
//   if (frm.doc.oasis_answer_change === "YES") {
//       frm.fields_dict.cko.$wrapper.show();
//   } 
// }

function toggleCheckboxAndLabel(frm) {
  if(frappe.user_roles.includes("QA") && frappe.session.user != "Administrator"){
      if ((frm.doc.error_marked === "No" || frm.doc.error_marked == '') || frm.doc.__islocal) {
        ['pdpc_qa','pdpc_qa_comments','pdx_qa','pdx_qa_comments','no_of_pages_qa','no_of_pages_qa_comments',
        'icd_codeqa', 'qa_mitem', 'qa_weightage_button', 'qa_table', 'qa_mitems'].forEach(field => frm.fields_dict[field].$wrapper.hide());
        frm.set_df_property("oasis_item","read_only",1)
        cur_frm.toggle_display(['section_break_121'],0)
        $('.control-label:contains("QA Feedback")').hide();
        $('.control-label:contains("QA Comments")').hide();
        frm.toggle_display("notepad", 0)
        //frm.toggle_display(['sticky_notes_table_section'],0);
      }
  }
}


// For the special cases 
function setupCheckboxValidation(frm, checkboxField, commentField) {
frappe.ui.form.on('Medical Coder Flow', {
    [checkboxField]: function(frm) {
      if (frm.doc[checkboxField]) {
        frm.enable_save();
      } else {
        frm.disable_save();
      }
    },
});
// For Special Cases when they go listview and come back save button is hiding 
// Soo to Enabling the  Save Button
// frm.cscript.refresh = function() {
//   if (!frm.doc.hold_reason && frm.doc.__unsaved) {
//       frm.enable_save();
//   }
// }; 
}

function same_date_validation(d) {
var alertEnabled = true;
var firstdate = d.get_field("firstdate").value;
var seconddate = d.get_field("seconddate").value;

if (firstdate === seconddate) {
  if (alertEnabled) {
    frappe.show_alert(__(`You can't select the same option`));
    d.standard_actions.hide();
    alertEnabled = false;
  }
} else {
  alertEnabled = true; 
  d.standard_actions.show();
}
}

function updateReadonlyProperty(frm, field, items) {
const isReadonly = !Array.isArray(items) || items.length === 0;
frm.set_df_property('rs_' + field + '_mitems', 'read_only', isReadonly ? 1 : 0);

if (frm.doc[field] === 0) {
  frm.set_value(field + '_mitems', []);
  frm.set_value('rs_' + field + '_mitems', '');
}
}



// M2200
function single_picklist_value_M2200(d) {
var fieldName, otherValue;
if (frappe.user_roles.includes("QA")) {  
  fieldName = "first_clinical";
  otherValue = d.fields[3].default;
} else if (frappe.user_roles.includes("Medical Coder")) {
  fieldName = "firstText";
  otherValue = d.get_field('secondText').value;
}

validateFields(d, fieldName, otherValue);

function validateFields(d, fieldName, otherValue) {
  var value = d.get_field(fieldName).value;
  var validationRules;
  if (otherValue === "No Data" && !isNaN(value)) {
    validationRules = [
      { condition: value.length > 3, message: 'Value should not exceed more than 3 digits'},
      { condition :/[^0-9]/.test(value) || isNaN(value),message : 'Value must only contain numbers'}
    ];
  } else {
    validationRules = [
      { condition: (otherValue === "No Data" && isNaN(value)) || (value === otherValue), message: `You can't select the same option` },
      { condition: value.length > 3 || otherValue.length > 3 , message: 'Value should not exceed more than 3 digits'},
      { condition: /[^0-9]/.test(value) || /[^0-9]/.test(otherValue),message: 'Value must only contain numbers' }
    ];
  }

  for (var i = 0; i < validationRules.length; i++) {
    if (validationRules[i].condition) {
      frappe.show_alert(__(validationRules[i].message));
      d.standard_actions.hide();
      return;
    }
  }
  d.standard_actions.show();
}
}

// function toggleVisibilityBasedOnRole(frm) {
// if (frm.doc.payor_type === "Commercial" && (frm.doc.assessment_type === "SOC" || frm.doc.assessment_type === "Recert" || frm.doc.assessment_type === "SCIC")) {
//   frm.toggle_display(['cko', 'check_for_o_series_mitems'], false);
// }
// }

// Remove the duplicate button from the both medical coder and QA after saving the form 
function remove_duplicate_button_in_child_table(frm){
  $(document).ready(function () {
    $('.grid-body').on('click', '.row-index', function () {
      $('.grid-duplicate-row.hidden-xs, .grid-insert-row.hidden-xs, .grid-insert-row-below.hidden-xs, .btn.btn-secondary.btn-sm.pull-right.grid-move-row.hidden-xs, .btn.btn-danger.btn-sm.pull-right.grid-delete-row, .btn.btn-secondary.btn-sm.pull-right.grid-append-row').hide();
    });

    $('.btn-open-row').on('click', function () {
      $('.grid-duplicate-row.hidden-xs, .grid-insert-row.hidden-xs, .grid-insert-row-below.hidden-xs, .btn.btn-secondary.btn-sm.pull-right.grid-move-row.hidden-xs, .btn.btn-danger.btn-sm.pull-right.grid-delete-row, .btn.btn-secondary.btn-sm.pull-right.grid-append-row').hide();
    });
  });
}

// Remove the duplicate button from the both medical coder and QA when the New Row data is added 
function observeOasisItemChanges(frm) {
  const isMedicalCoder = frappe.user_roles.includes("Medical Coder");
  let childTableFieldname = isMedicalCoder ? 'oasis_item' : ''

  function checkForChanges() {
      if (frm.doc[childTableFieldname]) {
          const currentRowLength = frm.doc[childTableFieldname].length;
          if (currentRowLength !== checkForChanges.lastRowLength) {
              if (isMedicalCoder || isQA) {
                remove_duplicate_button_in_child_table();
              }
              checkForChanges.lastRowLength = currentRowLength;
          }
      }
  }
  checkForChanges.lastRowLength = frm.doc[childTableFieldname] ? frm.doc[childTableFieldname].length : 0;
  setInterval(checkForChanges, 1000);
}

function qa_weightage_button(frm){

  if(frappe.user_roles.includes('QA')) {
    if(["Pending Quality","QA Error Accepted by QA TL","Coder Error Rejected by Department Head","QA Error Accepted by QA Manager"].includes(frm.doc.workflow_state)){
      $(`[data-fieldname="qa_weightage_button"]`).show();
    }else{
      $(`[data-fieldname="qa_weightage_button"]`).hide();
    }
  }
  else{
    $(`[data-fieldname="qa_weightage_button"]`).hide();
  }
}



function hide_unwanted_sections(frm){
  if(["Clarification Required- Query 1",
      "Clarification Required- Query 2",
      "Clarification Required- Query 3",
      "Send to Medical Coder - Answer 1",
      "Send to Medical Coder - Answer 2",
      "Send to Medical Coder - Answer 3",
      "Draft",
      "Production Completed","Picked for Audit"].includes(frm.doc.workflow_state)){
    frm.toggle_display(['qa_mitems_section'],0);
  }
}

const hide_qa_fields_section_based_no = (frm)=>{
  var fieldList = [
                  'pdx_qa',
                  'no_of_pages_qa', 
                  'pdpc_qa_comments', 
                  'pdx_qa_comments',
                  'no_of_pages_qa_comments', 
                  // 'qa_table', 
                  // 'qa_mitems',
                  'qa_mitem',
                  'icd_codeqa', 
                  'qa_icd_comments', 
                  'qa_mitem', 
                  'qa_weightage_button'
              ];

  if (frappe.user_roles.includes("QA")) {
      var hideFieldsAndSections = frm.doc.error_marked === "No" || frm.doc.error_marked === '';
      frm.toggle_display(fieldList, hideFieldsAndSections ? 0 : 1);
      // frm.set_df_property("oasis_item","read_only",1);
      [1, 2, 4, 5].forEach(function (index) {
          $(".form-column.col-sm-4").eq(index).toggle(!hideFieldsAndSections);
      });
  }
}

const coder_allowed = [
  "Draft",
  "Send to Medical Coder- answer 1",
  "Send to Medical Coder- answer 2",
  "Send to Medical Coder- Answer 3",
  "Coder Error Accepted by Department Head",
  "Coder Error Accepted by L2 Supervisor - 2nd Level Appeal"
]


const qa_allowed=[
  "Pending Quality",
  "QA Error Accepted by QA Manager",
  "Coder Error Rejected by Department Head"
]


// $(jQuery).on('click',()=>{
//   hide_print_button()
// })


$(jQuery).on('click','.first-page,.last-page,.prev-page,.next-page',function(){
display_serial_numbers_in_icd_code()
//icd_code
if(cur_frm.doc['icd_code'].length>50){
  cur_frm.fields_dict['icd_code'].$wrapper.find('.grid-row-check').prop('disabled',true)
}

//icd_codeqa
if(frappe.user_roles.includes("QA") && cur_frm.doc['icd_codeqa'].length>50 && !(qa_allowed.includes(cur_frm.doc.workflow_state)|| ( cur_frm.doc.workflow_state ="QA error accepted by QATL" && cur_frm.doc.accept_error_from_qa_lead=="Yes"))){
  cur_frm.fields_dict['icd_codeqa'].$wrapper.find('.grid-row-check').prop('disabled',true)
}

//sticky_notes
if( frappe.user_roles.includes('Medical Coder') && cur_frm.doc['sticky_notes_table'].length>50 && !(coder_allowed.includes(cur_frm.doc.workflow_state) ||  ( cur_frm.doc.workflow_state ="Error Marked By QA" && cur_frm.doc.accept_error_from_qa_lead=="Yes") || ( cur_frm.doc.workflow_state ="Coder Error Accepted  by L1 supervisor - 1st Level Appeal" && cur_frm.doc.error_based_on_feedback_received2=="Yes"))){
 cur_frm.fields_dict['sticky_notes_table'].$wrapper.find('.grid-row-check').prop('disabled',true)
}
})




const validate_sticky_notes_before_save = (frm, cdt, cdn)=>{
var regex = /[^a-zA-Z0-9.-]+/g;

var values = frappe.get_doc(cdt,cdn);
var count = new Map();
var check_special_charactes_mc = new Map()
var check_alpha = new Map()
if(frappe.user_roles.includes("Medical Coder")){
    var table = values.sticky_notes_table  || [] 
    for(var i = 0; i <table.length;i++){  
            if(table[i].first_diagnostics){
                if (table[i].first_diagnostics.length < 3 || table[i].first_diagnostics.length > 8) {  //score.first_diagnostics.length < 3 || score.first_diagnostics.length > 8
                count.set(table[i].idx,table[i].first_diagnostics)
            }
        }
        if (!/^[a-zA-Z]/.test(table[i].first_diagnostics)) {
          check_alpha.set(table[i].idx, table[i].first_diagnostics)
        }

        if(regex.test(table[i].first_diagnostics)){
            check_special_charactes_mc.set(table[i].idx,table[i].first_diagnostics)
        }
    }   
} else if (frappe.user_roles.includes("QA")){
    var table = values.icd_codeqa || []
    for(var i = 0; i <table.length;i++){    
        if(table[i].icd_qa){   
            if (table[i].icd_qa.length < 3 || table[i].icd_qa.length > 8) { 
              count.set(table[i].idx,table[i].icd_qa)
            }
        }
        if (!/^[a-zA-Z]/.test(table[i].icd_qa)) {
          check_alpha.set(table[i].idx, table[i].icd_qa)
      }
        if(regex.test(table[i].icd_qa)){
          check_special_charactes_mc.set(table[i].idx,table[i].icd_qa)
        }
    }
}
if (check_alpha.size >= 1){
  var duplicates = ""
  
  for (let [key, value] of check_alpha) {
    duplicates += `${key} : ${value}` + " <br> "
  }

  if(frappe.user_roles.includes("Medical Coder")){
    frappe.throw({
        title: __('Warning'),
        indicator: 'orange',
        message: __(`ICD codes in <b>sticky notes</b> should start with an alphabet <br> ${duplicates}`)
        
    });
    }
    else if(frappe.user_roles.includes("QA")){
      frappe.throw({
          title: __('Warning'),
          indicator: 'orange',
          message: __(`ICD codes in <b>ICD Code QA</b> should start with an alphbet <br> ${duplicates}`)
      });  
  }
  }
if(count.size >= 1){
    var duplicates = ""
    for (let [key, value] of count) {
        duplicates += `${key} : ${value}` + " <br> "
    }
    if(frappe.user_roles.includes("Medical Coder")){
        frappe.throw({
            title: __('Warning'),
            indicator: 'orange',
            message: __(`ICD codes in <b>sticky notes</b> should be between 3 and 8 characters <br> ${duplicates}`)
            
        });
    } else if(frappe.user_roles.includes("QA")){
        frappe.throw({
            title: __('Warning'),
            indicator: 'orange',
            message: __(`ICD codes in <b>ICD Code QA</b> should be between 3 and 8 characters <br> ${duplicates}`)
        });  
    }
}

if(check_special_charactes_mc.size >= 1){
    var duplicates = ""
    for (let [key, value] of check_special_charactes_mc) {
        duplicates += `${key} : ${value}` + " <br> "
    }
    if(frappe.user_roles.includes("Medical Coder")){
        frappe.msgprint({
              title: __('Warning'),
              indicator: 'orange',
              message: __(`ICD codes in <b>sticky notes</b> Only Alphanumeric characters  are allowed. <br> ${duplicates}`)
        }); 
        frappe.validated = false;
    } else if (frappe.user_roles.includes("QA")){
        frappe.msgprint({
          title: __('Warning'),
          indicator: 'orange',
          message: __(`Only Alphanumeric characters  are allowed in <b>ICD Codes</b> <br> ${duplicates}`)
        });
        frappe.validated = false;
    }
}
}

function disable_select_fields(frm,roles,workflow_state_1){

if(frappe.user_roles.includes(roles)){
  if(workflow_state_1.includes(frm.doc.workflow_state)){
    var fieldList = [
                "pdpc_qa",                      
              ]  

    fieldList.forEach(function(field) {
      // Disable the fields
      $(`[data-fieldname=${field}] [type="text"]`).attr("disabled", true);
      // Set the fields to readonly
      $(`[data-fieldname=${field}] [type="text"]`).prop("readonly", true);
    })
  }
}
}




function combined_mitems(frm) {
try {
  var combineMItemsD = {};
  frm.doc.combined_mitems = [];

  frm.doc.oasis_item.forEach(function(data) {
      combineMItemsD[data.oasis_items] = {
          "oasis_items": data.oasis_items,
          "questions": data.questions,
          "clinical": data.clinical,
          "redroad_response": data.redroad_response,
          "reason_for_change": data.reason_for_change
      };
  });

  if(frm.doc.qa_table.length > 0){
    frm.doc.qa_table.forEach(function(data) {
        if (combineMItemsD[data.qa_mitem]) {
            combineMItemsD[data.qa_mitem].red_road_qa_response = data.red_road_qa_response;
            combineMItemsD[data.qa_mitem].qa_rationale = data.qa_rationale;
        } else {
          combineMItemsD[data.qa_mitem] = {
              "red_road_qa_response": data.red_road_qa_response,
              "qa_rationale": data.qa_rationale,
              "oasis_items": data.qa_mitem,
              "questions": data.questions
          };
        }
    });
  }
  Object.values(combineMItemsD).forEach(function(combineData) {
      var newCombinedItem = {};
      newCombinedItem.oasis_items = combineData.oasis_items;
      newCombinedItem.questions = combineData.questions;
      newCombinedItem.clinical = combineData.clinical;
      newCombinedItem.redroad_response = combineData.redroad_response;
      newCombinedItem.reason_for_change = combineData.reason_for_change;
      newCombinedItem.red_road_qa_response = combineData.red_road_qa_response;
      newCombinedItem.qa_rationale = combineData.qa_rationale;

      frm.add_child("combined_mitems", newCombinedItem);
  });

  refresh_field("combined_mitems");
} catch (error) {
  console.log("error",error)
}
}

function validate_pdx_field(frm) {
  var trimmedLength = frm.doc.pdx.trim().length;
  const field = frm.get_field('pdx');
  if (frm.doc.pdx && frm.doc.pdx.length === trimmedLength && (trimmedLength < 3 || trimmedLength > 8)) {
      // frappe.msgprint(__("PDX: length should be between 3 and 8 characters"));
      field.set_description(__('<p style="color: red;"><b>Length should be between 3 and 8 characters</b></p>', [frm.doc.document_type]));
  }
  else {
    field.set_description(__('', [frm.doc.document_type]));
  }
  
}

function validate_pdx_qa_field(frm) {
  var trimmedLength = frm.doc.pdx_qa.trim().length;
  const field = frm.get_field('pdx_qa');
  if (frm.doc.pdx_qa && frm.doc.pdx_qa.length === trimmedLength && (trimmedLength < 3 || trimmedLength > 8)) {
      // frappe.msgprint(__("PDX(QA): length should be between 3 and 8 characters"));
      field.set_description(__('<p style="color: red;"><b>Length should be between 3 and 8 characters</b></p>', [frm.doc.document_type]));
  }
  else {
    field.set_description(__('', [frm.doc.document_type]));
  }
}

function validate_pdx_save(frm) {
if (!/^[a-zA-Z]/.test(frm.doc.pdx) && frm.doc.pdx) {
  frappe.throw({
      message: __('PDX field should start with an alphabet'),
      indicator: 'orange'
  }, 8);
  return;
}


if (frm.doc.pdx && (frm.doc.pdx.length < 3 || frm.doc.pdx.length > 8)) {
    frappe.throw({
        message: __("PDX: Length should be between 3 and 8 characters."),
        indicator: 'orange'
    }, 8);
    return;
}
}

function validate_pdx_qa_save(frm) {
if (!/^[a-zA-Z]/.test(frm.doc.pdx_qa) && frm.doc.pdx_qa) {
  frappe.throw({
      message: __('PDX(QA) field should start with an alphabet'),
      indicator: 'orange'
  }, 8);
  return;
}

if (frm.doc.pdx_qa && (frm.doc.pdx_qa.length < 3 || frm.doc.pdx_qa.length > 8)) {
    frappe.throw({
        message: __("PDX(QA): Length should be between 3 and 8 characters."),
        indicator: 'orange'
    }, 8);
    return;
}
}

frappe.ui.form.on("OASIS Child MItem",{
  // reason_for_change:function(frm,cdt,cdn){
  //   mitems_alert_msg(frm,cdt,cdn);
  // },
  // qa_reason_for_change:function(frm,cdt,cdn){
  //   mitems_alert_msg(frm,cdt,cdn);
  // },
})

function mitems_alert_msg(frm,cdt,cdn) {
  var d = locals[cdt][cdn]
  if (d.clinical && d.redroad_response) {
    frappe.call({
      method: 'wms.wms.doctype.medical_coder_flow.medical_coder_flow.check_oasis_item',
      args: {
          name: frm.doc.name,
          child: frm.doc.oasis_item,
          payor_type: frm.doc.payor_type,
          assessment_type:frm.doc.assessment_type

      },
      freeze: true,
      callback: (r) => { 
        if (r.message) {
        
          if (r.message[0] != "Exclude" && r.message[1].length > 1) {
            frappe.show_alert({
              title: __('Warning'),
              indicator: 'orange',
              message: __(r.message[0] + ' is present so responses for one of the <b>'+ r.message[1] + '</b> are mandatory')
              });
              frappe.validated = false;
          }
          if (r.message[0] != "Exclude" && r.message[1].length == 1) {
            frappe.show_alert({
              title: __('Warning'),
              indicator: 'orange',
              message: __(r.message[0] + ' is present so responses for <b>'+ r.message[1] + '</b> is mandatory')
              });
              frappe.validated = false;

          }
          if (r.message[0] == "Exclude") {
            frappe.show_alert({
              title: __('Warning'),
              indicator: 'orange',
              message: __(r.message[1] + ' is present so responses for <b>'+ r.message[2] + '</b> should not be present')
              });
              frappe.validated = false;
          }
      }
      }
    })
  }
}

function make_fields_readonly_for_super_users(frm){
if(frappe.user_roles.includes("Super Admin") || frappe.user_roles.includes("WMS Manager"))
{
  if(!["QA Error Accepted by QA Manager","Coder Error Rejected by Department Head"].includes(frm.doc.workflow_state)){
    frm.set_df_property("qa_error_comments","read_only", 1)
  }
  if(frm.doc.workflow_state != "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback"){
    frm.set_df_property("medical_coder_comments_two", "read_only", 1);
  }
  if(frm.doc.workflow_state != "Coder Error Accepted  by L1 supervisor - 1st Level Appeal"){
    frm.set_df_property("medical_coder_comment3", "read_only", 1);
  }
  if(frm.doc.workflow_state != "Coder 1st Level Appeal"){
    frm.set_df_property("accept_coder_error_from_coder", "read_only", 1);
    frm.set_df_property("team_lead_comments", "read_only", 1);  
  }
  if(frm.doc.workflow_state != "Error Marked By QA"){
    frm.set_df_property("medical_coder_comments", "read_only", 1); 
  }
  if(frm.doc.workflow_state != "Coder Error Rejected by L1 supervisor - 1st Level Appeal"){
    frm.set_df_property("accept_qa_error_by_qal", "read_only", 1);
    frm.set_df_property("qal_comments", "read_only", 1);
  }
  if(frm.doc.workflow_state != "Coder Error Accepted  by L1 supervisor - 1st Level Appeal"){
      frm.set_df_property("medical_coder_comment3", "read_only", 1);
      frm.set_df_property("error_based_on_feedback_received2", "read_only", 1);
  }
  if (!["Coder Error Accepted by Department Head","Coder Error Accepted  by L2 supervisor - 1st Level Appeal","Coder Error Accepted by L2 Supervisor - 2nd Level Appeal"].includes(frm.doc.workflow_state)){
    frm.set_df_property("coder_error_comments", "read_only", 1);
  }
  if(frm.doc.workflow_state != "Department Head Review - QA Error Rejected by QA Manager"){
    frm.set_df_property("accept_coder_error_by_dept_head", "read_only", 1);
    frm.set_df_property("dept_head_comments", "read_only", 1);
  }
  if (!["QA Error Accepted by QA TL"].includes(frm.doc.workflow_state)){
    frm.set_df_property("qa_error_comment", "read_only", 1);
  }
  if(frm.doc.workflow_state != "Error Marked By QA"){
    frm.set_df_property("coder_accept_error_from_qa", "read_only", 1);
  }
  if(frm.doc.workflow_state != "QA Error Accepted by QA TL"){
    frm.set_df_property("accept_error_from_qa_lead", "read_only", 1);
  }
  if(frm.doc.workflow_state == "Pending Quality")
  {
    frm.toggle_display("coder_accept_error_from_qa",0);
  }
  if(frm.doc.workflow_state == "Coder 1st Level Appeal")
  {
    frm.toggle_display("error_based_on_feedback_received2",0);
  }
  if(frm.doc.workflow_state == "Coder Error Rejected by L1 supervisor - 1st Level Appeal")
  {
    frm.toggle_display("accept_error_from_qa_lead",0);
  }
  if(frm.doc.workflow_state == "Chart Locked")
  {
    frm.disable_form();
  }

  var fields = ["pdpc_qa","no_of_pages_qa","pdx_qa","icd_code_qa","qa_mitems",
  // "qa_table",
                "pdpd_qa_comments","pdx_qa_comments","no_of_pages_qa_comments"]
  fields.forEach(function(field) {
    $(`[data-fieldname=${field}] [type="text"]`).attr("disabled", false);
  $(`[data-fieldname=${field}] [type="text"]`).prop("readonly", false);
  })
  
}
}

function upload_oasis_mitems(frm) {
  if(frm.is_new()){
    frappe.call({  
      method: 'wms.wms.doctype.medical_coder_flow.medical_coder_flow.get_mitem_values',
      args: {
        patient_reference_details : frm.doc.patient_reference_details,
      },
      callback: function(r) {
        var response = r.message;
        response.forEach(mitem => {
          var child_row = frm.add_child("oasis_item");
          child_row.naming_oasis = mitem.name;
          child_row.oasis_items = mitem.mitems;
          child_row.questions = mitem.questions;
          child_row.picklist = mitem.picklist;
        });
        frm.refresh_field('oasis_item')
      }
    });
  } 
}

function mitems_child_table_medicalcoder_qacoder(frm) {
  

  var gridWrapper = frm.fields_dict.oasis_item.grid.wrapper;

  var modifiedRows = new Set();

  gridWrapper.off('mouseover.grid-row').on('mouseover.grid-row', '.grid-row', function(event) {
    var rowIndex = parseInt($(this).attr('data-idx'));
    var row = frm.doc.oasis_item[rowIndex - 1];
    if(frm.doc.__isread){
      return
    }
    else if (
      ["Draft",
      "Send to Medical Coder - Answer 1",
      "Send to Medical Coder - Answer 2",
      "Send to Medical Coder - Answer 3"].includes(frm.doc.workflow_state) ||
      (frm.doc.workflow_state == "Error Marked By QA" && frm.doc.coder_accept_error_from_qa == "Yes") ||
      (frm.doc.workflow_state == "QA Error Accepted by QA TL" && frm.doc.accept_error_from_qa_lead == "Yes") ||
      (frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal" && frm.doc.error_based_on_feedback_received2 == "Yes") ||
      (frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback" && frm.doc.accept_error_two == "Yes") ||
      (frm.doc.workflow_state == "Pending Quality" && frm.doc.error_marked == "Yes") ||
      (frappe.user_roles.includes("Medical Coder") && ['Coder Error Accepted by Department Head','Coder Error Accepted  by L2 supervisor - 1st Level Appeal','Coder Error Accepted by L2 Supervisor - 2nd Level Appeal'].includes(frm.doc.workflow_state)) ||
      (frappe.user_roles.includes("QA") && ['Coder Error Rejected by Department Head','QA Error Accepted by QA Manager'].includes(frm.doc.workflow_state)) 
    ) {
      createDropdowns(frm, row, rowIndex);
    }else{
      frm.set_df_property("oasis_item","read_only",1);
    }
  });

  $('btn.btn-primary.btn-sm.primary-action').off('click').on('click', function(event) {
    event.preventDefault();
    if ($(this).attr('disabled')) {
      return;
    }
    $(this).attr('disabled', 'disabled');

    var modifiedDocs = [];
    modifiedRows.forEach(function(rowIndex) {
      modifiedDocs.push(frm.doc.oasis_item[rowIndex - 1]);
    });

    frappe.call({
      method: 'your_app.module_name.save_method',
      args: {
        docs: modifiedDocs
      },
      callback: function() {
        $('btn.btn-primary.btn-sm.primary-action').removeAttr('disabled');
      }
    });
  });

  gridWrapper.off('click.grid-dropdown').on('click.grid-dropdown', '.grid-row .dropdown-element', function(event) {
    event.preventDefault();
    event.stopPropagation();
  });
  disableDragBehavior(gridWrapper);

  gridWrapper.on('change', function() {
    var rowIndex = $(this).closest('.grid-row').attr('data-idx');
    modifiedRows.add(parseInt(rowIndex));
  });
}

function createDropdowns(frm, row, rowIndex) {
  if (!row) return;
  var $row = $(frm.fields_dict.oasis_item.grid.wrapper).find('.grid-row[data-idx="' + rowIndex + '"]');
  var $existingDropdown = $row.find('.custom-table-multiselect');
  if ($existingDropdown.length) return;

  var $row = $(frm.fields_dict.oasis_item.grid.wrapper).find('.grid-row[data-idx="' + rowIndex + '"]');
  switch (row.picklist) {
    case "SinglePicklist":
      handleSinglePicklistRow(row, rowIndex, frm, $row);
      break;
    case "DatePicker":
      handleDatePickerRow(row, rowIndex, frm, $row);
      break;
    case "Multiple Pick-List":
      handleMultiselectRow(row, rowIndex, frm, $row);
      break;
    default:
      break;
  }
}

function handleSinglePicklistRow(row, rowIndex, frm, $row) {
  var item_name = row.naming_oasis;

  function closeMultiselectDropdown() {
    $('.custom-table-multiselect').remove();
  }

  function setupDropdown(fieldname, options,currentField) {

    if (currentField !== fieldname && frappe.user_roles.includes("Medical Coder")) {
      $('.dropdown-container').remove();
    }  
    
    if (dropdownshouldbenotshown(frm)) {
      return;
    }


    var $input = $row.find('[data-fieldname="' + fieldname + '"]');
    var $dropdownContainer;
    var $datepickerDiv = $('.oasis_item_datepicker');
    var $singlePicklistDropdown = $('.dropdown-container');
  
    $input.on('click', function(event) {

      if (frm.doc.workflow_state == "Pending Quality" && check_qa_weightage_button_is_visible(frm) == "No") {
        return; 
      }

      closeMultiselectDropdown();
      if ($datepickerDiv.length) {
        $datepickerDiv.remove();
      }
      if ($singlePicklistDropdown.length) {
        $singlePicklistDropdown.remove();
      }
      $('.dropdown-container').remove();
  
      $dropdownContainer = $('<div>').addClass('dropdown-container custom-table-multiselect').css({
        'position': 'absolute',
        'top': '0',
        'left': '0',
        'width': '100px',
        'z-index': '1',
        'box-shadow': '0 0 10px rgba(0, 0, 0, 0.1)',
        'background-color': '#fff'
      });
      
      var $searchBar = $('<input type="text" placeholder="Search...">').addClass('form-control').css({
        'outline': '1px solid orange',
        'margin-bottom': '5px'
      });
      
      $searchBar.on('click', function(event) {
        event.stopPropagation();
      });
  
      $searchBar.on('input', function() {
        var searchText = $(this).val().trim().toLowerCase();
        $dropdownContainer.find('.option').each(function() {
          var optionText = $(this).text().toLowerCase();
          if (optionText.includes(searchText)) {
            $(this).show();
          } else {
            $(this).hide();
          }
        });
      });
  
      $dropdownContainer.append($searchBar);

    $(document).ready(function() {
      $(document).on('mousewheel DOMMouseScroll', function(e) {
          var delta = e.originalEvent.wheelDelta || -e.originalEvent.detail;
          if (delta > 0) {
              $('.dropdown-container').remove();
          } else {
              $('.dropdown-container').remove();
          }
          e.preventDefault();
      });
  
      $('.dropdown-container').on('mousewheel DOMMouseScroll', function(e) {
          e.stopPropagation();
      });
  });

  
      options.forEach(function(option) {
        var $option = $('<div>').addClass('option').text(option).css({
          'cursor': 'pointer',
          'padding': '5px'
        });
  
        $option.on('click', function() {
          var selectedValue = $(this).text();
          frm.doc.oasis_item[rowIndex - 1][fieldname] = selectedValue;
          frm.refresh_field('oasis_item');


          var otherField = (fieldname === "redroad_response") ? "clinical" : "redroad_response";
          var otherFieldValue = frm.doc.oasis_item[rowIndex - 1][otherField];
          if (selectedValue === otherFieldValue && ["Draft",
                                                    "Send to Medical Coder - Answer 1",
                                                    "Send to Medical Coder - Answer 2",
                                                    "Send to Medical Coder - Answer 3"].includes(frm.doc.workflow_state)) {
            frm.doc.oasis_item[rowIndex - 1][fieldname] = '';
            $row.find('[data-fieldname="' + fieldname + '"]').val('');
            frappe.show_alert({
              message: __("You cannot select the same option"),
              indicator: 'orange'
            }, 5);
            frm.refresh_field('oasis_item');
          }
  
          if (frappe.user_roles.includes("QA") && frm.doc.workflow_state === "Pending Quality") {
            var redroadResponseValue = frm.doc.oasis_item[rowIndex - 1]["redroad_response"];
            var qaClinicalResponseValue = frm.doc.oasis_item[rowIndex - 1]["qa_clinician_response"];
            if (redroadResponseValue === qaClinicalResponseValue) {
              frm.doc.oasis_item[rowIndex - 1]["qa_clinician_response"] = '';
              $row.find('[data-fieldname="qa_clinician_response"]').val('');
              frappe.show_alert({
                message: __("Redroad QA Response and Redroad Coder Response cannot have the same value"),
                indicator: 'orange'
              }, 5);
              frm.refresh_field('oasis_item');
            }
          }
          
          $dropdownContainer.remove();
        });
  
        $option.hover(function() {
          $(this).css('background-color', 'lightblue');
        }, function() {
          $(this).css('background-color', '');
        });
  
        $dropdownContainer.append($option);
      });
  
      $('body').append($dropdownContainer);
  
      var inputPosition = $input.offset();
      var inputWidth = $input.outerWidth();
      $dropdownContainer.css({
        position: 'absolute',
        top: inputPosition.top + $input.outerHeight() + 5,
        left: inputPosition.left,
        width: inputWidth,
      });
  
      event.stopPropagation();
    });
  
    $(document).on('click', function(event) {
      if (!$(event.target).closest('.dropdown-container').length && !$(event.target).is($input)) {
        $('.dropdown-container').remove();
      }
    });
  }

  frappe.model.with_doc('MItem Values', item_name, function() {
    const item_doc = frappe.model.get_doc('MItem Values', item_name);
    var multiple_sub_values = item_doc.sub_values.map(subValue => subValue.sub_values);
   

    if (multiple_sub_values && multiple_sub_values.length == 0) {
      handletherapyneed(row, rowIndex, frm, $row);
    } else {
      if (frappe.user_roles.includes("Medical Coder")) {
        setupDropdown("clinical", ["NA"].concat(multiple_sub_values), 'clinical');
        setupDropdown("redroad_response", multiple_sub_values,'redroad_response');
      } else if (frappe.user_roles.includes("QA")) {
        setupDropdown("qa_clinician_response", multiple_sub_values);
      }
    }
  });

  $(document).on('click', function(event) {
    $('.dropdown-container').remove();
  });

  $row.find('[data-fieldname="reason_for_change"]').on('click', function(event) {
    $('.dropdown-container').remove();
  });

  $(document).ready(function() {
  
    $('.nav-link').on('click', function(event) {
      $('.dropdown-container').remove();
    });
  
    $(document).on('click', function(event) {
      if (!$(event.target).closest('.oasis_item').length && !$(event.target).closest('.dropdown-container').length) {
        $('.dropdown-container').remove();
      }
    });
  
    window.addEventListener('popstate', function() {
      $('.dropdown-container').remove();
    });

    $('#navbar-breadcrumbs a, .navbar-brand').on('click', function(event) {
      $('.dropdown-container').remove();
    });

  });
}

function handleDatePickerRow(row, rowIndex, frm, $row) {
  var $datepickerDiv = null;
  var item_name = row.naming_oasis;

  function closeMultiselectDropdown() {
    $('.custom-table-multiselect').remove();
  }
  
  function setupDatepicker(fieldname,additionalClass) {
    var $input = $row.find('[data-fieldname="' + fieldname + '"]');
    var $singlePicklistDropdown = $('.dropdown-container');

    $input.on('click', function(event) {
      if (dropdownshouldbenotshown(frm)) {
        return;
      }
      $('.oasis_item_datepicker').remove()
      closeMultiselectDropdown();
      if ($singlePicklistDropdown.length) {
        $singlePicklistDropdown.remove();
      }
      if ($datepickerDiv) {
        $datepickerDiv.remove();
        $datepickerDiv = null;
        return;
      }
      $datepickerDiv = $('<div style="display:block;">').addClass('hasDatepicker').addClass(additionalClass);;

      $datepickerDiv.on('click', function(event) {
        event.stopPropagation();
      });


      $(document).ready(function() {
        $(document).on('mousewheel DOMMouseScroll', function(e) {
            var delta = e.originalEvent.wheelDelta || -e.originalEvent.detail;
            if (delta > 0) {
              $('.oasis_item_datepicker').remove();
            } else {
              $('.oasis_item_datepicker').remove();
            }
            e.preventDefault();
        });
    
        $('.oasis_item_datepicker').on('mousewheel DOMMouseScroll', function(e) {
          e.stopPropagation();
        });
      });


      if (fieldname === "clinical") {
        $datepickerDiv.datepicker({
          language: 'en',
          maxDate: new Date(),
          dateFormat: 'mm/dd/yyyy',
          todayHighlight: true,
          onSelect: function(dateText) {
            var rowin = rowIndex - 1;
            frm.doc.oasis_item[rowin][fieldname] = dateText;
            frm.refresh_field('oasis_item');
            $datepickerDiv.remove();
            $datepickerDiv = null;            
            $input.blur();

            var otherFieldName = (fieldname === 'clinical') ? 'redroad_response' : 'clinical';
            var otherFieldValue = frm.doc.oasis_item[rowin][otherFieldName];
            if (otherFieldValue === dateText && ["Draft",
                                                "Send to Medical Coder - Answer 1",
                                                "Send to Medical Coder - Answer 2",
                                                "Send to Medical Coder - Answer 3"].includes(frm.doc.workflow_state)) {
              frm.doc.oasis_item[rowIndex - 1][fieldname] = '';
              $row.find('[data-fieldname="' + fieldname + '"]').val('');
              frappe.show_alert({
                message: __("You can't select the same Date"),
                indicator: 'orange'
              }, 5);
              frm.refresh_field('oasis_item');
            }

          }
        });

        $('body').append($datepickerDiv);

        var inputPosition = $input.offset();
        var inputWidth = $input.outerWidth();
        $datepickerDiv.css({
          position: 'absolute',
          top: inputPosition.top + $input.outerHeight() + 5,
          left: inputPosition.left,
          width: inputWidth,
          zIndex: 9999
        });

        $datepickerDiv.datepicker('show');

        event.stopPropagation();
        return;
      } else if (fieldname === "redroad_response") {
        $datepickerDiv.datepicker({
          language: 'en',
          autoclose: true,
          maxDate: new Date(),
          dateFormat: 'mm/dd/yyyy',
          todayHighlight: true,
          onSelect: function(dateText) {
            var rowin = rowIndex - 1;
            frm.doc.oasis_item[rowin][fieldname] = dateText;
            frm.refresh_field('oasis_item');
            $datepickerDiv.remove();
            $datepickerDiv = null;
            $input.blur();

            var otherFieldName = (fieldname === 'clinical') ? 'redroad_response' : 'clinical';
            var otherFieldValue = frm.doc.oasis_item[rowin][otherFieldName];
            if (otherFieldValue === dateText && ["Draft",
                                                  "Send to Medical Coder - Answer 1",
                                                  "Send to Medical Coder - Answer 2",
                                                  "Send to Medical Coder - Answer 3"].includes(frm.doc.workflow_state)) {
              frm.doc.oasis_item[rowIndex - 1][fieldname] = '';
              $row.find('[data-fieldname="' + fieldname + '"]').val('');
              frappe.show_alert({
                message: __("You cannot select the same Date"),
                indicator: 'orange'
              }, 5);
              frm.refresh_field('oasis_item');
            }

          }
        });

        $('body').append($datepickerDiv);

        var inputPosition = $input.offset();
        var inputWidth = $input.outerWidth();
        $datepickerDiv.css({
          position: 'absolute',
          top: inputPosition.top + $input.outerHeight() + 5,
          left: inputPosition.left,
          width: inputWidth,
          zIndex: 9999
        });

        $datepickerDiv.datepicker('show');

        event.stopPropagation();
        return;
      } else if (fieldname === "qa_clinician_response") {
        $datepickerDiv.datepicker({
          language: 'en',
          maxDate: new Date(),
          dateFormat: 'mm/dd/yyyy',
          todayHighlight: true,
          onSelect: function(dateText) {
            var rowin = rowIndex - 1;
            frm.doc.oasis_item[rowin][fieldname] = dateText;
            frm.refresh_field('oasis_item');
            $datepickerDiv.remove();
            $datepickerDiv = null;
            $input.blur();

            if (frappe.user_roles.includes("QA") && frm.doc.workflow_state === "Pending Quality") {
              var redroadResponseValue = frm.doc.oasis_item[rowIndex - 1]["redroad_response"];
              var qaClinicalResponseValue = frm.doc.oasis_item[rowIndex - 1]["qa_clinician_response"];
              if (redroadResponseValue === qaClinicalResponseValue) {
                frm.doc.oasis_item[rowIndex - 1][fieldname] = '';
                $row.find('[data-fieldname="' + fieldname + '"]').val('');
                frappe.show_alert({
                  message: __("You cannot select the same Date"),
                  indicator: 'orange'
                }, 5);
                frm.refresh_field('oasis_item');
              }
            }

          }
        });

        $('body').append($datepickerDiv);

        var inputPosition = $input.offset();
        var inputWidth = $input.outerWidth();
        $datepickerDiv.css({
          position: 'absolute',
          top: inputPosition.top + $input.outerHeight() + 5,
          left: inputPosition.left,
          width: inputWidth,
          zIndex: 9999
        });

        $datepickerDiv.datepicker('show');
 
        event.stopPropagation();
        return;
      }

      var $datepickerInput = $('<input type="text" placeholder="Select Date...">').addClass('form-control').addClass('highlight-outline');
      $datepickerDiv.append($datepickerInput);

      $datepickerInput.datepicker({
        language: 'en',
        autoclose: true
      });

      $('body').append($datepickerDiv);

      var inputPosition = $input.offset();
      var inputWidth = $input.outerWidth();
      $datepickerDiv.css({
        position: 'absolute',
        top: inputPosition.top + $input.outerHeight() + 5,
        left: inputPosition.left,
        width: inputWidth,
        zIndex: 9999
      });

      $datepickerInput.datepicker('show');

      $datepickerInput.on('changeDate', function(e) {
        var selectedDate = e.format();
        frm.set_value(fieldname, selectedDate);
        $datepickerDiv.remove();
        $datepickerDiv = null;
      });

      event.stopPropagation();
    });
  }

  frappe.model.with_doc('MItem Values', item_name, function() {
    if (frappe.user_roles.includes("Medical Coder")) {
      setupDatepicker("clinical","oasis_item_datepicker");
      setupDatepicker("redroad_response","oasis_item_datepicker");
    } else if (frappe.user_roles.includes("QA")) {
      setupDatepicker("qa_clinician_response","oasis_item_datepicker");
    }
  });

  $(document).on('click', function(event) {
    if (!$datepickerDiv || (!$datepickerDiv.is(event.target) && $datepickerDiv.has(event.target).length === 0 && !$row.is(event.target) && $row.has(event.target).length === 0)) {
      if ($datepickerDiv) {
        $datepickerDiv.remove();
        $datepickerDiv = null;
      }
    }
  });

  $(document).ready(function() {
      $('.nav-link').on('click', function(event) {
      if ($datepickerDiv) {
        $datepickerDiv.remove();
        $datepickerDiv = null;
      }
    });
  
    $(document).on('click', function(event) {
      if (!$(event.target).closest('.oasis_item').length && !$(event.target).closest('.dropdown-container').length) {
        if ($datepickerDiv) {
          $datepickerDiv.remove();
          $datepickerDiv = null;
        }
      }
    });
  
    $('#navbar-breadcrumbs a, .navbar-brand').on('click', function(event) {
      if ($datepickerDiv) {
        $datepickerDiv.remove();
        $datepickerDiv = null;
      }
    });

    window.addEventListener('popstate', function() {
      $('.dropdown-container').remove();
    });

  });
}

function handleMultiselectRow(row, rowIndex, frm, $row) {
var $checkboxDiv = null;
var item_name = row.naming_oasis;
var $datepickerDiv = $('.oasis_item_datepicker');

function setupDropdown(fieldname, options) {
  var $input = $row.find('[data-fieldname="' + fieldname + '"]');
  var rowIndexmultiple = rowIndex;
  var $singlePicklistDropdown = $('.dropdown-container');

  $input.on('click', function(event) {
    if (dropdownshouldbenotshown(frm)) {
      return;
    }
    closeMultiselectDropdown();
      var rowIndex = rowIndexmultiple;
      if ($datepickerDiv.length) {
        $datepickerDiv.remove();
      }
      if ($singlePicklistDropdown.length) {
        $singlePicklistDropdown.remove();
      }
      if ($checkboxDiv) {
        $checkboxDiv.remove();
        $checkboxDiv = null;
      }

      $checkboxDiv = $('<div style="display:block;">').addClass('form-control table-multiselect custom-table-multiselect');
      var $searchBar = $('<input type="text" placeholder="Search...">').addClass('form-control');
      $searchBar.css('outline', '1px solid orange')
      $checkboxDiv.append($searchBar);

      $(document).ready(function() {
        $(document).on('mousewheel DOMMouseScroll', function(e) {
            var delta = e.originalEvent.wheelDelta || -e.originalEvent.detail;
            if (delta > 0) {
                $('.table-multiselect').remove();
            } else {
                $('.table-multiselect').remove();
            }
            e.preventDefault();
        });
    
        $('.table-multiselect').on('mousewheel DOMMouseScroll', function(e) {
            e.stopPropagation();
        });
    });

      options.forEach(function(option) {
        var $checkboxDivItem = $('<div>').addClass('checkbox-item');
        var $checkbox = $('<input type="checkbox">').val(option).addClass('option-checkbox');
        var $label = $('<label style="display: flex !important;">').text(option).prepend($checkbox);
        $checkboxDivItem.append($label);
        $checkboxDiv.append($checkboxDivItem);
        if(frm.doc.oasis_item[rowIndex - 1][fieldname]){
          if (frm.doc.oasis_item[rowIndex - 1][fieldname].includes(option)) {
            $checkbox.prop('checked', true);
          }
        }        
      });
    
      $('.checkbox-item').css('margin-bottom', '5px');

      $('body').append($checkboxDiv);

      var inputPosition = $input.offset();
      var inputWidth = $input.outerWidth();
      $checkboxDiv.css({
        position: 'absolute',
        top: inputPosition.top + $input.outerHeight() + 5,
        left: inputPosition.left,
        width: inputWidth + inputWidth,
        zIndex: 9999
      });

      $searchBar.on('input', function() {
        var searchText = $(this).val().toLowerCase();
        $checkboxDiv.find('label').each(function() {
          var optionText = $(this).text().toLowerCase();
          if (optionText.includes(searchText)) {
            $(this).show();
          } else {
            $(this).hide();
          }
        });
      });

      $checkboxDiv.on('change', '.option-checkbox', function() {
        var selectedValues = [];
        $checkboxDiv.find('.option-checkbox:checked').each(function() {
          selectedValues.push($(this).val());
        });

        var isFirstCheckedNone = selectedValues.includes('0-None; no charge for current services');
        var isFirstCheckedUnknown = selectedValues.includes('UK-Unknown');
        var isThirdCheckedNone = selectedValues.includes('3-None of the above');
        var isTenthCheckedNone = selectedValues.includes('10-None of the above');
        var isNaSelected = selectedValues.includes('NA');

        var isSpecialValueSelected = isFirstCheckedNone || isFirstCheckedUnknown || isThirdCheckedNone || isTenthCheckedNone || isNaSelected;
  
        $checkboxDiv.find('input[type="checkbox"]').prop('checked', false);
        $checkboxDiv.find('input[type="checkbox"]').prop('disabled', false);
      
        if (isSpecialValueSelected) {
          var selectedValue = isFirstCheckedNone ? '0-None; no charge for current services' :
              (isFirstCheckedUnknown ? 'UK-Unknown' :
                  (isThirdCheckedNone ? '3-None of the above' :
                      (isTenthCheckedNone ? '10-None of the above' :
                          (isNaSelected ? 'NA' : null))));
      
          frm.doc.oasis_item[rowIndex - 1][fieldname] = selectedValue;
          frm.refresh_field('oasis_item');
      
          $checkboxDiv.find('input[type="checkbox"][value="' + selectedValue + '"]').prop('checked', true);
          $checkboxDiv.find('input[type="checkbox"]:not([value="' + selectedValue + '"])').prop('disabled', true);
        } else {
          frm.doc.oasis_item[rowIndex - 1][fieldname] = selectedValues.join('\n');
          frm.refresh_field('oasis_item');
      
          selectedValues.forEach(function(value) {
            $checkboxDiv.find('input[type="checkbox"][value="' + value + '"]').prop('checked', true);
          });
        }
        var clinicalValue = frm.doc.oasis_item[rowIndex - 1]["clinical"];
        var redroadResponseValue = frm.doc.oasis_item[rowIndex - 1]["redroad_response"];

        var qaclinicalvalue = frm.doc.oasis_item[rowIndex - 1]["qa_clinician_response"];
    
        if (fieldname === "clinical") {
          checkDuplicateValues(clinicalValue, redroadResponseValue);
        } else if (fieldname === "redroad_response") {
            checkDuplicateValues(redroadResponseValue, clinicalValue);
        } else if (fieldname === "qa_clinician_response") {
            checkDuplicateValues(qaclinicalvalue, redroadResponseValue);
        }
      });

    event.stopPropagation();
  });
}

frappe.model.with_doc('MItem Values', item_name, function() {
    const item_doc = frappe.model.get_doc('MItem Values', item_name);
    var multiple_sub_values = item_doc.sub_values.map(subValue => subValue.sub_values);

    if (frappe.user_roles.includes("Medical Coder")) {
        setupDropdown("clinical", ["NA"].concat(multiple_sub_values));
        setupDropdown("redroad_response", multiple_sub_values);
    } else if (frappe.user_roles.includes("QA")) {
        setupDropdown("qa_clinician_response", multiple_sub_values);
    }
});
  
function closeMultiselectDropdown() {
  $('.custom-table-multiselect').remove();
}

  $(document).on('click', function(event) {
    if (!$checkboxDiv || (!$checkboxDiv.is(event.target) && $checkboxDiv.has(event.target).length === 0 && !$row.is(event.target) && $row.has(event.target).length === 0)) {
      if ($checkboxDiv) {
        $checkboxDiv.remove();
        $checkboxDiv = null;
      }
    }
  });

  $row.find('[data-fieldname="reason_for_change"], [data-fieldname="qa_resason_for_change"]').on('click', function(event) {
    if ($checkboxDiv) {
      $checkboxDiv.remove();
      $checkboxDiv = null;
    }
  });

  $(document).ready(function() {
    $('.nav-link').on('click', function(event) {
      if ($checkboxDiv) {
        $checkboxDiv.remove();
        $checkboxDiv = null;
      }
    });
  
    $('#navbar-breadcrumbs a, .navbar-brand').on('click', function(event) {
      if ($checkboxDiv) {
        $checkboxDiv.remove();
        $checkboxDiv = null;
      }
    });


    window.addEventListener('popstate', function() {
      $('.dropdown-container').remove();
    });    
  });

  function checkDuplicateValues(value1, value2) {
    if (["Draft",
    "Send to Medical Coder - Answer 1",
    "Send to Medical Coder - Answer 2",
    "Send to Medical Coder - Answer 3"].includes(frm.doc.workflow_state) && value1 === value2 && value1 !== undefined && value2 !== undefined) {
      frappe.show_alert({
        message: __("Clinical and Redroad Response fields have the same value"),
        indicator: 'orange'
      });
    } else if (frm.doc.workflow_state === "Pending Quality" && value1 === value2 && value1 !== undefined && value2 !== undefined) {
      frappe.show_alert({
        message: __("Redroad QA Response and Redroad Coder Response cannot have the same value"),
        indicator: 'orange'
      });
    }
  }
}

function handletherapyneed(row, rowIndex, frm, $row) {
  var item_name = row.naming_oasis;

  function closeMultiselectDropdown() {
    $('.custom-table-multiselect').remove();
  }  
  var $datepickerDiv = $('.oasis_item_datepicker');
  var $singlePicklistDropdown = $('.dropdown-container');

  function setupInput(fieldname, maxLength, counterpartField) {
    var $clinicalField = $row.find('textarea[data-fieldname="clinical"]');
    var $redroadResponseField = $row.find('textarea[data-fieldname="redroad_response"]');
    var $qaClinicianResponseField = $row.find('textarea[data-fieldname="qa_clinician_response"]');

    if (frappe.user_roles.includes("Medical Coder")) {
        $clinicalField.on('input', function() {
          var clinicalValue = $(this).val().replace(/[^\d]/g, '').substring(0, 3);
          var redroadResponseValue = $redroadResponseField.val().replace(/[^\w\s]/gi, '').substring(0, 3);
            $(this).val(clinicalValue);

            if (["Draft",
                "Send to Medical Coder - Answer 1",
                "Send to Medical Coder - Answer 2",
                "Send to Medical Coder - Answer 3"].includes(frm.doc.workflow_state) && clinicalValue !== "" && redroadResponseValue !== "" && !isNaN(clinicalValue) && !isNaN(redroadResponseValue) && clinicalValue === redroadResponseValue) {
              frappe.show_alert({
                  message: __("You cannot enter the same value"),
                  indicator: 'orange'
              }, 5);
              $(this).val('');
            }
        });

        $redroadResponseField.on('input', function() {
          var redroadResponseValue = $(this).val().replace(/[^\d]/g, '').substring(0, 3);
          var clinicalValue = $clinicalField.val().replace(/[^\d]/g, '').substring(0, 3);

            $(this).val(redroadResponseValue);

            if (["Draft",
                "Send to Medical Coder - Answer 1",
                "Send to Medical Coder - Answer 2",
                "Send to Medical Coder - Answer 3"].includes(frm.doc.workflow_state) && clinicalValue !== "" && redroadResponseValue !== "" && !isNaN(clinicalValue) && !isNaN(redroadResponseValue) && clinicalValue === redroadResponseValue) {
              frappe.show_alert({
                  message: __("You cannot enter the same value"),
                  indicator: 'orange'
              }, 5);
              $(this).val('');
            }
        });
    }

    if (frappe.user_roles.includes("QA")) {
        $qaClinicianResponseField.on('input', function() {
          var qaClinicianResponseValue = $(this).val().replace(/[^\d]/g, '').substring(0, 3);;
          var redroadResponseValue = $redroadResponseField.val().replace(/[^\d]/g, '').substring(0, 3);
          
          if (qaClinicianResponseValue.length > 3) {
              $(this).val(qaClinicianResponseValue.substring(0, 3));
          } else {
              $(this).val(qaClinicianResponseValue);
          }

          if (frm.doc.workflow_state === "Pending Quality" && qaClinicianResponseValue !== "" && redroadResponseValue !== "" && !isNaN(qaClinicianResponseValue) && !isNaN(redroadResponseValue) && qaClinicianResponseValue === redroadResponseValue) {
            frappe.show_alert({
                message: __("You cannot enter the same value"),
                indicator: 'orange'
            }, 5);
            $(this).val('');
          }
        });
    }
  }

  function setupDropdown(fieldname, options) {

    var $input = $row.find('[data-fieldname="' + fieldname + '"]');
    $input.attr('type', 'text');

    $input.on('click', function(event) {
      closeMultiselectDropdown();
      if (dropdownshouldbenotshown(frm)) {
        return;
      }
      if ($datepickerDiv.length) {
        $datepickerDiv.remove();
      }
      if ($singlePicklistDropdown.length) {
        $singlePicklistDropdown.remove();
      }
      $('.dropdown-container').remove();

      var $dropdownContainer = $('<div>').addClass('dropdown-container').css({
        'position': 'absolute',
        'top': '0',
        'left': '0',
        'z-index': '1',
        'box-shadow': '0 0 10px rgba(0, 0, 0, 0.1)',
        'background-color': '#fff'
      });

      options.forEach(function(option) {
        var $option = $('<div>').addClass('option').text(option).css({
          'cursor': 'pointer',
          'padding': '5px'
        });

        $option.on('click', function() {
          var selectedValue = $(this).text();
          frm.doc.oasis_item[rowIndex - 1][fieldname] = selectedValue;
          frm.refresh_field('oasis_item');
        });

        $dropdownContainer.append($option);
        $(document).ready(function() {
          $(document).on('mousewheel DOMMouseScroll', function(e) {
              var delta = e.originalEvent.wheelDelta || -e.originalEvent.detail;
              if (delta > 0) {
                  $('.dropdown-container').remove();
              } else {
                  $('.dropdown-container').remove();
              }
              e.preventDefault();
          });
      
          $('.dropdown-container').on('mousewheel DOMMouseScroll', function(e) {
              e.stopPropagation();
          });
      });
      });

      $('body').append($dropdownContainer);

      var inputPosition = $input.offset();
      var inputWidth = $input.outerWidth();
      $dropdownContainer.css({
        position: 'absolute',
        top: inputPosition.top + $input.outerHeight() + 5,
        left: inputPosition.left,
        width: inputWidth,
      });

      event.stopPropagation();
    });
  }

  frappe.model.with_doc('MItem Values', item_name, function() {
    if (frappe.user_roles.includes("Medical Coder")) {
      var clinicalOptions = ["NA"];
      setupDropdown("clinical", clinicalOptions);
      setupInput("clinical", 3, "redroad_response");
      setupInput("redroad_response", 3, "clinical");
    } else if (frappe.user_roles.includes("QA")) {
      setupInput("qa_clinician_response", 3);
    }
  });


  $(document).on('click', function(event) {
    $('.dropdown-container').remove();
  });

  $row.find('[data-fieldname="reason_for_change"],[data-fieldname="qa_reason_for_change"]').on('click', function(event) {
    $('.dropdown-container').remove();
  });

  $(document).ready(function() {
    $('.nav-link').on('click', function(event) {
      $('.dropdown-container').remove();
    });
  
    window.addEventListener('popstate', function() {
      $('.dropdown-container').remove();
    });

    $('#navbar-breadcrumbs a, .navbar-brand').on('click', function(event) {
      $('.dropdown-container').remove();
    });
  });
}

function removed_pagination_oasis_item_table(frm){
  frm.get_field('oasis_item').grid.grid_pagination.page_length = 1000;
  frm.get_field('oasis_item').grid.reset_grid();  
}

function onhover_questions_oasisitem(frm) {
  cur_frm.fields_dict["oasis_item"].grid.wrapper.on('mouseover', '.grid-row', function(event) {
    var rowIndex = parseInt($(this).attr('data-idx'));
    var row = cur_frm.fields_dict["oasis_item"].grid.get_row(rowIndex - 1);

    if (row && row.doc) {
      updateFieldTitle($(this), "questions", row.doc.questions);
      updateFieldTitle($(this), "clinical", row.doc.clinical);
      updateFieldTitle($(this), "redroad_response", row.doc.redroad_response);
      updateFieldTitle($(this), "reason_for_change", row.doc.reason_for_change);
      updateFieldTitle($(this), "qa_clinician_response", row.doc.qa_clinician_response);
      updateFieldTitle($(this), "qa_resason_for_change", row.doc.qa_resason_for_change);
    }
  });
}

function updateFieldTitle(element, fieldName, value) {
  if (value) {
    element.find('.grid-static-col[data-fieldname="' + fieldName + '"]').attr('title', value);
  }
}
// function draft_state_hide_qa_coloumns(frm) {
//   frappe.after_ajax(function() {
//     var hideColumns = frm.is_new() || frm.doc.__unsaved || frm.doc.workflow_state == "Draft" || frm.doc.chart_status == "Yet-to-start";

//     if (hideColumns) {
//       $('.grid-static-col[data-fieldname="qa_clinician_response"], .grid-static-col[data-fieldname="qa_resason_for_change"]').hide();
//       $('.grid-heading-row .grid-static-col[data-fieldname="qa_clinician_response"]').hide();
//       $('.grid-heading-row .grid-static-col[data-fieldname="qa_resason_for_change"]').hide();
//     }
//   });
// }

function timeline_hideshow(frm) {
  var footerVisible = false;
  
  $('.new-timeline').hide();
  // to check the button is present or not
  if (!$('.btn-toggle-footer').length) {
    $('.new-timeline').before('<button class="btn-toggle-footer btn btn-primary hide-timeline">Show Timeline</button>');
  }

  $('body').off('click', '.btn-toggle-footer').on('click', '.btn-toggle-footer', function() {
    if (footerVisible) {
      $('.new-timeline').hide();
      $(this).text('Show Timeline');
      footerVisible = false;
    } else {
      $('.new-timeline').show();
      $(this).text('Hide Timeline');
      footerVisible = true;
    }
  });
}

 function assignemnt_date_val (frm) {
  if (frm.doc.assessment_date > get_today()) {
    msgprint('You can not select future date in Assessment Date');
    validated = false;
  }
}

//Static tabs
frappe.ui.form.on("Medical Coder Flow", {
  refresh: function (frm) {
    function hasRole(role) {
      return frappe.user_roles.includes(role);
    }
    $(document).ready(function (){
        if ($('.new-container').length === 0) {
          var newContainer = $('<div class="new-container"></div>');
          $(".form-page").before(newContainer);
          var mrNumberField = `
                <div class="row">
                    <div class="col-md-2">
                        <div class="frappe-control input-max-width" data-fieldtype="Data" data-fieldname="mr_number" title="mr_number">
                            <div class="form-group">
                                <div class="clearfix">
                                    <label class="control-label" style="padding-right: 0px; color: black;">MR Number</label>
                                    <span class="help"></span>
                                </div>
                                <div class="control-input-wrapper">
                                    <div class="control-input" style="display: none;"></div>
                                    <div class="control-value like-disabled-input bold mr-number-value" style="" title="This value is fetched from Patient Reference Details's Mr Number field">${frm.doc.mr_number}</div>
                                    <p class="help-box small text-muted"></p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="frappe-control input-max-width" data-fieldtype="Data" data-fieldname="field_2" title="field_2">
                            <div class="form-group">
                                <div class="clearfix">
                                    <label class="control-label" style="padding-right: 0px; color: black;">Payor Type</label>
                                    <span class="help"></span>
                                </div>
                                <div class="control-input-wrapper">
                                    <div class="control-input" style="display: none;"></div>
                                    <div class="control-value like-disabled-input bold payor_type-value" style="" title="Value for Field 2">${frm.doc.payor_type}</div>
                                    <p class="help-box small text-muted"></p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="frappe-control input-max-width" data-fieldtype="Data" data-fieldname="field_3" title="field_3">
                            <div class="form-group">
                                <div class="clearfix">
                                    <label class="control-label" style="padding-right: 0px; color: black;">Assessment Type</label>
                                    <span class="help"></span>
                                </div>
                                <div class="control-input-wrapper">
                                    <div class="control-input" style="display: none;"></div>
                                    <div class="control-value like-disabled-input bold assessment_type-value" style="" title="Value for Field 3">${frm.doc.assessment_type}</div>
                                    <p class="help-box small text-muted"></p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="frappe-control input-max-width" data-fieldtype="Data" data-fieldname="field_4" title="field_4">
                            <div class="form-group">
                                <div class="clearfix">
                                    <label class="control-label" style="padding-right: 0px; color: black;">Patient Name</label>
                                    <span class="help"></span>
                                </div>
                                <div class="control-input-wrapper">
                                    <div class="control-input" style="display: none;"></div>
                                    <div class="control-value like-disabled-input bold patient_name-value" style="" title="Value for Field 4">${frm.doc.patient_name}</div>
                                    <p class="help-box small text-muted"></p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-2">
                    <div class="frappe-control input-max-width" data-fieldtype="Data" data-fieldname="field_5" title="field_5">
                        <div class="form-group">
                            <div class="clearfix">
                                <label class="control-label" style="padding-right: 0px; color: black;">Branch</label>
                                <span class="help"></span>
                            </div>
                            <div class="control-input-wrapper">
                                <div class="control-input" style="display: none;"></div>
                                <div class="control-value like-disabled-input bold branch-value" style="" title="Value for Field 5">${frm.doc.branch}</div>
                                <p class="help-box small text-muted"></p>
                            </div>
                        </div>
                    </div>
                </div>                
                </div>
            `;
          newContainer.append($(mrNumberField));
        } else {
          $('.mr-number-value').text(frm.doc.mr_number);
          $('.payor_type-value').text(frm.doc.payor_type);
          $('.assessment_type-value').text(frm.doc.assessment_type);
          $('.patient_name-value').text(frm.doc.patient_name);
          $('.branch-value').text(frm.doc.branch);
        }

        if (frappe.user.has_role("QA Inventory Allocation")&& frappe.session.user != "Administrator" && !frappe.user_roles.includes("WMS Manager") && !frappe.user_roles.includes("Super Admin")) {
          $('.mr-number-value').closest('.col-md-2').hide();
          $('.branch-value').closest('.col-md-2').hide();
        }else if((frappe.user.has_role("QA Lead")&& frappe.session.user != "Administrator" && !frappe.user_roles.includes("WMS Manager") && !frappe.user_roles.includes("Super Admin") )&& ['Picked for Audit','Pending Quality'].includes(frm.doc.workflow_state)){
          $('.mr-number-value').closest('.col-md-2').hide();
          $('.branch-value').closest('.col-md-2').hide();
        }else {
          $('.mr-number-value').closest('.col-md-2').show();
          $('.branch-value').closest('.col-md-2').show();
        }
    
    })
  }
})
  


function disableDragBehavior($gridWrapper) {
  $gridWrapper.on('dragstart', '.grid-row', function(event) {
      event.preventDefault();
  });
}
function special_cases_hide_notepad(frm){

  if(frm.doc.workflow_state == "QA Error Accepted by QA TL"  && frm.doc.accept_error_from_qa_lead == "No"){
    frm.toggle_display("notepad", 0)
    //frm.toggle_display(['sticky_notes_table_section'],0);
  }
  if(frm.doc.workflow_state == "Error Marked By QA"  && frm.doc.coder_accept_error_from_qa == "No"){
    $('[data-fieldname="notepad"]').hide();
  }
  if(frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal" && frm.doc.error_based_on_feedback_received2 == "No"){
    $('[data-fieldname="notepad"]').hide();
  }
  if(frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback" && frm.doc.accept_error_two == "No"){
    $('[data-fieldname="notepad"]').hide();
  }
}

function show_notepad(frm){
  frm.toggle_display("notepad", 1)
  frm.set_value("notepad","")
}

function qa_notepad(frm){


  var stat_arr = ["Draft",
      "Coder Error Accepted by Department Head",
      'Coder Error Accepted  by L2 supervisor - 1st Level Appeal',
      "Send to Medical Coder - Answer 1",
      "Send to Medical Coder - Answer 2",
      "Send to Medical Coder - Answer 3"];

     
    if (stat_arr.includes(cur_frm.doc.workflow_state) && ("Medical Coder").includes(frappe.boot.wms.role_profile)) {
      $(`[data-fieldname="notepad"]`).show();
      frm.toggle_display(['sticky_notes_table_section'],1);
     }
    
  var stat_arrqa = ["QA Error Accepted by QA Manager","Coder Error Rejected by Department Head"];
 
    if (stat_arrqa.includes(cur_frm.doc.workflow_state) && ("QA").includes(frappe.boot.wms.role_profile)) {
      $(`[data-fieldname="notepad"]`).show();
      frm.toggle_display(['sticky_notes_table_section'],1);
   } 
}
function restrict_pdx_field(frm) {
  if (frappe.user.has_role('Medical Coder') || frappe.session.user == "Administrator") {
  const pdxField = frm.get_field('pdx');
  if(pdxField && pdxField.$input) {
    pdxField.$input.on('input', function() {
      if (this.value.length > 8) {
        this.value = this.value.slice(0, 8);
      }
    });
  }
}

if (frappe.user.has_role('QA') || frappe.session.user == "Administrator") {
  const pdxqaField = frm.get_field('pdx_qa');
  if(pdxqaField && pdxqaField.$input) {
    pdxqaField.$input.on('input', function() {
      if (this.value.length > 8) {
        this.value = this.value.slice(0, 8);
      }
    });
  }
}

$(cur_frm.fields_dict['sticky_notes_table'].grid.wrapper)
.on('input', '[data-fieldname="first_diagnostics"]', function() {
    var value = $(this).val();
    if (value.length > 8) {
        $(this).val(value.substring(0, 8));
    }
});

$(cur_frm.fields_dict['icd_codeqa'].grid.wrapper)
.on('input', '[data-fieldname="icd_qa"]', function() {
    var value = $(this).val();
    if (value.length > 8) {
        $(this).val(value.substring(0, 8));
    }
});
}


function check_qa_weightage_button_is_visible(frm){
  var isVisible = frm.fields_dict.qa_weightage_button.$wrapper[0].style.display !== "none";
  if(isVisible){
    return "Yes"
  }else{
    return "No"
  }
}

function dropdownshouldbenotshown(frm) {
  return (
    frm.doc.workflow_state == "Pending Quality" && check_qa_weightage_button_is_visible(frm) == "No" ||
    frm.doc.workflow_state == "QA Error Accepted by QA TL" && frm.doc.chart_status == "QA Error Accepted by QA TL" && frm.doc.accept_error_from_qa_lead == "Yes" && frm.doc.qa_tick && !frm.doc.__unsaved ||
    frm.doc.workflow_state == "Error Marked By QA" && frm.doc.chart_status == "Error Marked By QA" && frm.doc.coder_accept_error_from_qa == "Yes" && frm.doc.mc_tick && !frm.doc.__unsaved ||
    frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal" && frm.doc.chart_status == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal" && frm.doc.error_based_on_feedback_received2 == "Yes" && frm.doc.mc_tick_3 && !frm.doc.__unsaved ||
    frm.doc.workflow_state == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback" && frm.doc.chart_status == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback" && frm.doc.accept_error_two == "Yes" && frm.doc.mc_tick_two && !frm.doc.__unsaved ||
    false
  );
}

function after_save_show_fields(frm){
  frm.toggle_display(['technical_issue'],1);
  frm.toggle_display(['hold_reason'],1);
}

function hold_reason_import_file(frm){
  if (frm.doc.hold_reason) {
    frm.set_df_property('import_file', "read_only", 0)
  }else{
    frm.set_df_property('import_file', "read_only",1)
    frm.set_value("import_file", "");
  }
}