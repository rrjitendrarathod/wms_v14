// Copyright (c) 2022, Manju and contributors
// For license information, please see license.txt

frappe.ui.form.on('Testing Form', {
	// refresh: function(frm) {

	// }
});



// Selecting the values

frappe.ui.form.on('Testing Form',{
    m_item: function (frm) {
		
        if (frm.doc.m_item) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    'doctype': 'MItem Test',
                    'name': frm.doc.m_item,
                },
                callback: function (r) {

					
							
					var sub_type_list = [];
                    var sub_type = r.message;
					
					

				

                    // for (var x = 0; x < sub_type.length; x++) {
                    //     sub_type_list[x] = sub_type[x]['questions'];
						
                    // }

                 
					//Questions 
                    frm.set_df_property('questions', 'options',sub_type['questions']);
					cur_frm.set_value("questions",sub_type['questions'])
                    frm.refresh_field('questions');


					frm.set_df_property('picklist', 'options',sub_type['pick_list']);
					cur_frm.set_value("picklist",sub_type['pick_list'])
                    frm.refresh_field('picklist');

				
                
                }
            });
        }
    },
})






frappe.ui.form.on('Testing Form', {
    m_item: function (frm) {
        if (frm.doc.m_item) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    'doctype': 'MItem Values',
                    'name': frm.doc.m_item,
                },
                callback: function (r) {

                    console.log(r)


                    
                    var sub_type_list = [];
                    var sub_type = r.message['sub_values'];

                    for (var x = 0; x < sub_type.length; x++) {
                        sub_type_list.push(sub_type[x]['sub_values']);
                    }

                    // console.log(sub_type_list)
                    
                    frappe.meta.get_docfield(frm.doc.doctype,'values', frm.doc.name).options = sub_type_list; 
                    frm.refresh_field('values');                   
                    frappe.model.set_value(frm.doc.mitem_test, frm.doc.name, 'values', sub_type_list[0]);     
                    
                    


                    var sec_sub_type_list = [];
                    var sub_type = r.message['options_values'];

                    for (var x = 0; x < sub_type.length; x++) {
                        sec_sub_type_list.push(sub_type[x]['options_values']);
                    }

                    // console.log(sec_sub_type_list)
                    
                    frappe.meta.get_docfield(frm.doc.doctype,'options', frm.doc.name).options = sec_sub_type_list; 
                    frm.refresh_field('options');                   
                    frappe.model.set_value(frm.doc.mitem_test, frm.doc.name, 'options', sec_sub_type_list[0]); 


                }
                
            });

           
        }
    },
    onload: function (frm) {
        if (frm.doc.m_item) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    'doctype': 'MItem Values',
                    'name': frm.doc.m_item,
                },
                callback: function (r) {


                    console.log(r);
                    var sub_type_list = [];
                    var sub_type = r.message['sub_values'];

                    for (var x = 0; x < sub_type.length; x++) {
                        sub_type_list.push(sub_type[x]['sub_values']);
                    }

                   
                    
                    frappe.meta.get_docfield(frm.doc.doctype,'values', frm.doc.name).options = sub_type_list; 
                    frm.refresh_field('values');                   
                    frappe.model.set_value(frm.doc.mitem_test, frm.doc.name, 'values', sub_type_list[0]);     
                    
                    
                }
                
            });

           
        }
    } 


    
});




// // Filters For SOC,Recert 


frappe.ui.form.on('Testing Form', {
    setup: function(frm) {
        
        frm.set_query("m_item",function(doc) {
            
            if(doc.function == "Medicare" && doc.sub_function == "SOC"){
                return {
                    "filters": [
                    //   ['MItem Test','name',"in","M0069,M0150"]

                    ['MItem Test','mitems',"in","M1005,M2200,M0090,M0150,M0069,M1028,M1030,M1033,M1242,M1306,M1311A1,M1311B1,M1311C1,M1311D1,M1311E1,M1311F1,M1324 ,M1322,M1330,M1332,M1334,M1340,M1342,M1400,M1620,M1630,M1700,M1710,M1720,M1800,M1810,M1820,M1830,M1840,M1845,M1850,M1860,M1870,M2020,GG0130 A1 - (SOC/ROC Perf),GG0130 A2 - Discharge Goal,GG0130 B1 -  (SOC/ROC Perf),GG0130 B2  - Dishcarge Goal,GG0130 C1 -  (SOC/ROC Perf),GG0130 C2 - Discharge Goal ,GG0130 E1 -  (SOC/ROC Perf),GG0130 E2 - Discharge Goal,GG0130 F1 -  (SOC/ROC Perf),GG0130 F2 - Discharge Goal,GG0130 G1 -  (SOC/ROC Perf),GG0130 G2 - Discharge Goal,GG0130 H1 -  (SOC/ROC Perf),GG0130 H2 - Discharge Goal,GG0170 B1 -  (SOC/ROC Perf),GG0170 B1 - Dishcarge Goal,GG0170 C1 -  (SOC/ROC Perf),GG0170 C2 - Discharge Goal,GG0170 D1 -  (SOC/ROC Perf),GG0170 D2 - Discharge Goal,GG0170 E1 -  (SOC/ROC Perf),GG0170 E2  - Discharge Goal,GG0170 F1 -  (SOC/ROC Perf),GG0170 F2 - Dishcarge Goal,GG0170 G1 -  (SOC/ROC Perf),GG0170 G2 - Discharge Goal,GG0170 I1 -  (SOC/ROC Perf),GG0170 I2 - Discharge Goal,GG0170 J1 -  (SOC/ROC Perf),GG0170 J2 - Discharge Goal,GG0170 K1 -  (SOC/ROC Perf),GG0170 K2 - Discharge Goal,GG0170 L1 -  (SOC/ROC Perf),GG0170 L2 - Discharge Goal,GG0170 M1 -  (SOC/ROC Perf),GG0170 M2 - Discharge Goal,GG0170 N1 -  (SOC/ROC Perf),GG0170 N2 - Discharge Goal,GG0170 O1 -  (SOC/ROC Perf),GG0170 O2 - Discharge Goal,GG0170 P1 -  (SOC/ROC Perf),GG0170 P2 - Discharge Goal,GG0170 Q1 -  (SOC/ROC Perf),GG0170 Q2 - Discharge Goal,GG0170 R1 -  (SOC/ROC Perf),GG0170 R2 - Discharge Goal,GG0170 RR1,GG0170 S1 -  (SOC/ROC Perf),GG0170 S2 - Discharge Goal,GG0170 SS1 "]
                   
                    ]
                }
                
            }
            


            else if(doc.function == "Medicare" && doc.sub_function == "Recert"){
                return {
                    "filters": [
                    //   ['MItem Test','name',"in","M0069,M0150"]
    
                    ['MItem Test','mitems',"in","M2200,M0090,M0150,M1030,M1033,M1242,M1306,M1311A1,M1311B1,M1311C1,M1311D1,M1311E1,M1311F1,M1322,M1324,M1330,M1332,M1334,M1340,M1342,M1400,M1620,M1630,M1700,M1710,M1720,M1810,M1820,M1830,M1840,M1850,M1860,GG0130A4 (followup-performance),GG0130B4  (followup-performance),GG0130C4  (followup-performance),GG0170D4  (followup-performance),GG0170E4  (followup-performance),GG0170F4 (followup-performance),GG0170I4 (followup-performance),GG0170J4 (followup-performance),GG0170L4 (followup-performance),GG0170M4 (followup-performance),GG0170N4 (followup-performance),GG0170Q4 (followup-performance),GG0170R4 (followup-performance)"]
                       
                    ]
                }
                    
            }




            else if(doc.function == "Medicare" && doc.sub_function == "ROC"){
                return {
                    "filters": [
                    //   ['MItem Test','name',"in","M0069,M0150"]
    
                    ['MItem Test','mitems',"in","M0102,M0104,M2200,M0090,M0150,M0069,M1028,M1030,M1033,M1242,M1306,M1311A1,M1311B1,M1311C1,M1311D1,M1311E1,M1311F1,M1324 ,M1322,M1330,M1332,M1334,M1340,M1342,M1400,M1620,M1630,M1700,M1710,M1720,M1800,M1810,M1820,M1830,M1840,M1845,M1850,M1860,M1870,M2020,GG0130 A1 - (SOC/ROC Perf),GG0130 A2 - Discharge Goal,GG0130 B1 -  (SOC/ROC Perf),GG0130 B2  - Dishcarge Goal,GG0130 C1 -  (SOC/ROC Perf),GG0130 C2 - Discharge Goal ,GG0130 E1 -  (SOC/ROC Perf),GG0130 E2 - Discharge Goal,GG0130 F1 -  (SOC/ROC Perf),GG0130 F2 - Discharge Goal,GG0130 G1 -  (SOC/ROC Perf),GG0130 G2 - Discharge Goal,GG0130 H1 -  (SOC/ROC Perf),GG0130 H2 - Discharge Goal,GG0170 B1 -  (SOC/ROC Perf),GG0170 B1 - Dishcarge Goal,GG0170 C1 -  (SOC/ROC Perf),GG0170 C2 - Discharge Goal,GG0170 D1 -  (SOC/ROC Perf),GG0170 D2 - Discharge Goal,GG0170 E1 -  (SOC/ROC Perf),GG0170 E2  - Discharge Goal,GG0170 F1 -  (SOC/ROC Perf),GG0170 F2 - Dishcarge Goal,GG0170 G1 -  (SOC/ROC Perf),GG0170 G2 - Discharge Goal,GG0170 I1 -  (SOC/ROC Perf),GG0170 I2 - Discharge Goal,GG0170 J1 -  (SOC/ROC Perf),GG0170 J2 - Discharge Goal,GG0170 K1 -  (SOC/ROC Perf),GG0170 K2 - Discharge Goal,GG0170 L1 -  (SOC/ROC Perf),GG0170 L2 - Discharge Goal,GG0170 M1 -  (SOC/ROC Perf),GG0170 M2 - Discharge Goal,GG0170 N1 -  (SOC/ROC Perf),GG0170 N2 - Discharge Goal,GG0170 O1 -  (SOC/ROC Perf),GG0170 O2 - Discharge Goal,GG0170 P1 -  (SOC/ROC Perf),GG0170 P2 - Discharge Goal,GG0170 Q1 -  (SOC/ROC Perf),GG0170 Q2 - Discharge Goal,GG0170 R1 -  (SOC/ROC Perf),GG0170 R2 - Discharge Goal,GG0170 RR1,GG0170 S1 -  (SOC/ROC Perf),GG0170 S2 - Discharge Goal,GG0170 SS1"]
                       
                    ]
                }
                    
            }
            


            else if(doc.function == "Medicare" && doc.sub_function == "SCIC"){
                return {
                    "filters": [
                    //   ['MItem Test','name',"in","M0069,M0150"]
    
                    ['MItem Test','mitems',"in","M2200,M0090,M1030,M1033,M1242,M1306,M1311A1,M1311B1,M1311C1,M1311D1,M1311E1,M1311F1,M1322,M1324,M1330,M1332,M1334,M1340,M1342,M1400,M1620,M1630,M1700,M1710,M1720,M1810,M1820,M1830,M1840,M1850,M1860,GG0130A4 (followup-performance),GG0130B4  (followup-performance),GG0130C4  (followup-performance),GG0170D4  (followup-performance),GG0170E4  (followup-performance),GG0170F4 (followup-performance),GG0170I4 (followup-performance),GG0170J4 (followup-performance),GG0170L4 (followup-performance),GG0170M4 (followup-performance),GG0170N4 (followup-performance),GG0170Q4 (followup-performance),GG0170R4 (followup-performance)"]
                       
                    ]
                }
                    
            }

            // Managed Care  SOC

            else if(doc.function == "Managed Care" && doc.sub_function == "SOC"){
                return {
                    "filters": [
                    //   ['MItem Test','name',"in","M0069,M0150"]
    
                    ['MItem Test','mitems',"in","M1005,M2200,M0090,M0069,M0150,M1028,M1033,M1242,M1306,M1311A1,M1311B1,M1311C1,M1311D1,M1311E1,M1311F1,M1322,M1324,M1330,M1332,M1334,M1340,M1342,M1400,M1700,M1710,M1720,M1800,M1810,M1820,M1830,M1840,M1845,M1850,M1860,M1870,M2020,GG0130 A1 - (SOC/ROC Perf),GG0130 A2 - Discharge Goal,GG0130 B1 -  (SOC/ROC Perf),GG0130 B2  - Dishcarge Goal,GG0130 C1 -  (SOC/ROC Perf),GG0130 C2 - Discharge Goal,GG0130 E1 -  (SOC/ROC Perf),GG0130 E2 - Discharge Goal,GG0130 F1 -  (SOC/ROC Perf),GG0130 F2 - Discharge Goal,GG0130 G1 -  (SOC/ROC Perf),GG0130 G2 - Discharge Goal,GG0130 H1 -  (SOC/ROC Perf),GG0130 H2 - Discharge Goal,GG0170 B1 -  (SOC/ROC Perf),GG0170 B1 - Dishcarge Goal,GG0170 C1 -  (SOC/ROC Perf),GG0170 C2 - Discharge Goal,GG0170 D1 -  (SOC/ROC Perf),GG0170 D2 - Discharge Goal,GG0170 E1 -  (SOC/ROC Perf),GG0170 E2  - Discharge Goal,GG0170 F1 -  (SOC/ROC Perf),GG0170 F2 - Dishcarge Goal,GG0170 G1 -  (SOC/ROC Perf),GG0170 G2 - Discharge Goal,GG0170 I1 -  (SOC/ROC Perf),GG0170 I2 - Discharge Goal,GG0170 J1 -  (SOC/ROC Perf),GG0170 J2 - Discharge Goal,GG0170 K1 -  (SOC/ROC Perf),GG0170 K2 - Discharge Goal,GG0170 L1 -  (SOC/ROC Perf),GG0170 L2 - Discharge Goal,GG0170 M1 -  (SOC/ROC Perf),GG0170 N1 -  (SOC/ROC Perf),GG0170 N2 - Discharge Goal,GG0170 O1 -  (SOC/ROC Perf),GG0170 O2 - Discharge Goal,GG0170 P1 -  (SOC/ROC Perf),GG0170 P2 - Discharge Goal,GG0170 Q1 -  (SOC/ROC Perf),GG0170 Q2 - Discharge Goal,GG0170 R1 -  (SOC/ROC Perf),GG0170 R2 - Discharge Goal,GG0170 RR1,GG0170 S1 -  (SOC/ROC Perf),GG0170 S2 - Discharge Goal,GG0170 SS1"]
                       
                    ]
                }
                    
            }

            
            // Managed Care  Recert

            else if(doc.function == "Managed Care" && doc.sub_function == "Recert"){
                return {
                    "filters": [
                    //   ['MItem Test','name',"in","M0069,M0150"]
    
                    ['MItem Test','mitems',"in","M2200,M0090,M0150,M1030,M1033,M1242,M1306,M1311A1,M1311B1,M1311C1,M1311D1,M1311E1,M1311F1,M1322,M1324,M1330,M1332,M1334,M1340,M1342,M1400,M1620,M1630,M1700,M1710,M1720,M1810,M1820,M1830,M1840,M1850,M1860,GG0130A4 (followup-performance),GG0130B4  (followup-performance),GG0130C4  (followup-performance),GG0170D4  (followup-performance),GG0170E4  (followup-performance),GG0170F4 (followup-performance),GG0170I4 (followup-performance),GG0170J4 (followup-performance),GG0170L4 (followup-performance),GG0170M4 (followup-performance),GG0170N4 (followup-performance),GG0170Q4 (followup-performance),GG0170R4 (followup-performance)"]
                       
                    ]
                }
                    
            }



                // Managed Care  ROC


            else if(doc.function == "Managed Care" && doc.sub_function == "ROC"){
                return {
                    "filters": [
                    //   ['MItem Test','name',"in","M0069,M0150"]
    
                    ['MItem Test','mitems',"in","M0102,M0104,M1005,M2200,M0090,M0150,M0069,M1028,M1030,M1033,M1242,M1306,M1311A1,M1311B1,M1311C1,M1311D1,M1311E1,M1311F1,M1324 ,M1322,M1330,M1332,M1334,M1340,M1342,M1400,M1620,M1630,M1700,M1710,M1720,M1800,M1810,M1820,M1830,M1840,M1845,M1850,M1860,M1870,M2020,GG0130 A1 - (SOC/ROC Perf),GG0130 A2 - Discharge Goal,GG0130 B1 -  (SOC/ROC Perf),GG0130 B2  - Dishcarge Goal,GG0130 C1 -  (SOC/ROC Perf),GG0130 C2 - Discharge Goal ,GG0130 E1 -  (SOC/ROC Perf),GG0130 E2 - Discharge Goal,GG0130 F1 -  (SOC/ROC Perf),GG0130 F2 - Discharge Goal,GG0130 G1 -  (SOC/ROC Perf),GG0130 G2 - Discharge Goal,GG0130 H1 -  (SOC/ROC Perf),GG0130 H2 - Discharge Goal,GG0170 B1 -  (SOC/ROC Perf),GG0170 B1 - Dishcarge Goal,GG0170 C1 -  (SOC/ROC Perf),GG0170 C2 - Discharge Goal,GG0170 D1 -  (SOC/ROC Perf),GG0170 D2 - Discharge Goal,GG0170 E1 -  (SOC/ROC Perf),GG0170 E2  - Discharge Goal,GG0170 F1 -  (SOC/ROC Perf),GG0170 F2 - Dishcarge Goal,GG0170 G1 -  (SOC/ROC Perf),GG0170 G2 - Discharge Goal,GG0170 I1 -  (SOC/ROC Perf),GG0170 I2 - Discharge Goal,GG0170 J1 -  (SOC/ROC Perf),GG0170 J2 - Discharge Goal,GG0170 K1 -  (SOC/ROC Perf),GG0170 K2 - Discharge Goal,GG0170 L1 -  (SOC/ROC Perf),GG0170 L2 - Discharge Goal,GG0170 M1 -  (SOC/ROC Perf),GG0170 M2 - Discharge Goal,GG0170 N1 -  (SOC/ROC Perf),GG0170 N2 - Discharge Goal,GG0170 O1 -  (SOC/ROC Perf),GG0170 O2 - Discharge Goal,GG0170 P1 -  (SOC/ROC Perf),GG0170 P2 - Discharge Goal,GG0170 Q1 -  (SOC/ROC Perf),GG0170 Q2 - Discharge Goal,GG0170 R1 -  (SOC/ROC Perf),GG0170 R2 - Discharge Goal,GG0170 RR1,GG0170 S1 -  (SOC/ROC Perf),GG0170 S2 - Discharge Goal,GG0170 SS1"]
                       
                    ]
                }
                    
            }


                // Managed Care  SCIC

            else if(doc.function == "Managed Care" && doc.sub_function == "SCIC"){
                return {
                    "filters": [
                    //   ['MItem Test','name',"in","M0069,M0150"]
    
                    ['MItem Test','mitems',"in","M2200,M0090,M1030,M1033,M1242,M1306,M1311A1,M1311B1,M1311C1,M1311D1,M1311E1,M1311F1,M1322,M1324,M1330,M1332,M1334,M1340,M1342,M1400,M1620,M1630,M1700,M1710,M1720,M1810,M1820,M1830,M1840,M1850,M1860,GG0130A4 (followup-performance),GG0130B4  (followup-performance),GG0130C4  (followup-performance),GG0170D4  (followup-performance),GG0170E4  (followup-performance),GG0170F4 (followup-performance),GG0170I4 (followup-performance),GG0170J4 (followup-performance),GG0170L4 (followup-performance),GG0170M4 (followup-performance),GG0170N4 (followup-performance),GG0170Q4 (followup-performance),GG0170R4 (followup-performance)"]
                       
                    ]
                }
                    
            }

            // Commercial  SOC

            else if(doc.function == "Commercial" && doc.sub_function == "SOC"){
                return {
                    "filters": [
                   
    
                    ['MItem Test','mitems',"in","M2200,M0090,M0069,M0150,M1028,M2200"]
                       
                    ]
                }
                    
            }


            // Commercial  Recert

            else if(doc.function == "Commercial" && doc.sub_function == "Recert"){
                return {
                    "filters": [
                   
    
                    ['MItem Test','mitems',"in","M2200,M0090,M0069,M0150,M2200"]
                       
                    ]
                }
                    
            }



            // Commercial  ROC

            else if(doc.function == "Commercial" && doc.sub_function == "ROC"){
                return {
                    "filters": [
                   
    
                    ['MItem Test','mitems',"in","M0102,M0104,M2200,M0090,M0069,M0150,M0104,M1028,M2200"]
                       
                    ]
                }
                    
            }




            // Commercial  SCIC

            else if(doc.function == "Commercial" && doc.sub_function == "SCIC"){
                return {
                    "filters": [
                   
    
                    ['MItem Test','mitems',"in","M2200,M0090,M0069,M0150,M2200"]
                       
                    ]
                }
                    
            }

           


                
        });
    }
});



// //Filters for the Multiple_values 

frappe.ui.form.on('Testing Form', {
    setup: function(frm) {
        
        frm.set_query("multiple_values",function(doc) {
            
            if(doc.m_item == "M1033"){
                return {
                    "filters": [
                  
                        ["MItems Multiple Values",'multiple_values',"in","5-Decline in mental status in the past 3 months, 6-Reported or observed history of difficulty complying with any medical instructions in the past 3 months ,1-History of falls (2 or more falls – or any fall with an injury – in the past 12 months),2-Unintentional weight loss of a total of 10 pounds or more in the past 12 months,3-Multiple hospitalizations (2 or more) in the past 6 months,4-Multiple emergency department visits (2 or more) in the past 6 months,7-Currently taking 5 or more medications,8-Currently reports exhaustion,9-Other risk(s) not listed in 1 - 8,10-None of the above"]
                               
                    ]
                }
               
            }
            else if(doc.m_item == "M1030"){
                return {
                    "filters": [
                  
                        ["MItems Multiple Values",'multiple_values',"in","M1030 - 3-Enteral nutrition ( any other artificial entry into the alimentary canal),M1030 - 4-None of the above, M1030 - 2-Parenteral nutrition (TPN or lipids),M1030 - 1-Intravenous or infusion therapy (excludes TPN)"]
                            
                   
                    ]
                }
               
            }
            else if(doc.m_item == "M0150"){
                return {
                    "filters": [
                  
                        ["MItems Multiple Values",'multiple_values',"in","0-None; no charge for current services,1-Medicare (traditional fee-for-service),2-Medicare (HMO/managed care/Advantage plan),3-Medicaid (traditional fee-for-service),4-Medicaid (HMO/managed care),5-Workers' compensation,6-Title programs,7-Other government,8-Private insurance,9-Private HMO/managed care,10-Self-pay,11-Other (specify)"]
                  
                   
                    ]
                }

                
               
            }
            else if(doc.m_item == "M1028"){
                return {
                    "filters": [                  
                        ["MItems Multiple Values",'multiple_values',"in","M1028 -3-None of the above,M1028 - 2-Diabetes Mellitus (DM),M1028 - 1-Peripheral Vascular Disease (PVD) or Peripheral Arterial Disease (PAD)"]                  
                   
                    ]
                }
               
            }


            
        });
    }
});


frappe.ui.form.on('Testing Form', 'validate', function(frm) {
    if(frm.doc.questions == "Therapy Need"){
        if (frm.doc.three_digits.length<=2 || frm.doc.three_digits.length >= 4)  {
        msgprint('Number should be 3 digits');
        Validate = false;
        }
    }
 
});




