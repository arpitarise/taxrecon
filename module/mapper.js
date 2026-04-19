/**
 * mapper.js - Data Transformation & Schema Mapping Module
 */

const MapperModule = {
    // Schema Definitions
    schemas: {
        SALES_MASTER: [
            "invoice_no", "invoice_date", "gstin_customer", 
            "taxable_value", "igst", "cgst", "sgst", "place_of_supply"
        ],
        PURCHASE_MASTER: [
            "supplier_gstin", "invoice_no", "invoice_date", 
            "taxable_value", "igst", "cgst", "sgst", "itc_eligibility"
        ],
        GSTR2B_MASTER: [
            "supplier_gstin", "invoice_no", "taxable_value", "tax_amount"
        ]
    },

    // Fuzzy mapping dictionary (Target Schema Key : Possible Source Keys)
    fieldAliases: {
        gstin_customer: ["gstin", "customer_gstin", "party_gstin", "registration_no", "uin"],
        supplier_gstin: ["gstin", "supplier_gstin", "ctin", "party_gstin", "registration_no"],
        invoice_date: ["date", "inv_date", "voucher_date", "doc_date"],
        tax_amount: ["tax_amt", "total_tax", "integrated_tax", "tax_value"],
        place_of_supply: ["pos", "state_name", "supply_state", "place_of_supply"],
        itc_eligibility: ["itc", "eligibility", "itc_available", "remarks"]
    },

    /**
     * Generic mapper function
     * @param {Array} data - The array of objects to map
     * @param {Array} targetSchema - The list of keys for the output
     */
    mapToSchema(data, targetSchema) {
        if (!data || data.length === 0) return [];

        return data.map(row => {
            const mappedRow = {};
            
            targetSchema.forEach(targetKey => {
                // 1. Direct match
                if (row[targetKey] !== undefined) {
                    mappedRow[targetKey] = row[targetKey];
                } 
                // 2. Fuzzy match via aliases
                else {
                    const aliases = this.fieldAliases[targetKey] || [];
                    const foundAlias = aliases.find(alias => row[alias] !== undefined);
                    
                    mappedRow[targetKey] = foundAlias ? row[foundAlias] : this.getDefaultValue(targetKey);
                }
            });

            // 3. Special Logic: Calculate GSTR2B tax_amount if missing
            if (targetSchema === this.schemas.GSTR2B_MASTER && !mappedRow.tax_amount) {
                const igst = parseFloat(row.igst) || 0;
                const cgst = parseFloat(row.cgst) || 0;
                const sgst = parseFloat(row.sgst) || 0;
                mappedRow.tax_amount = igst + cgst + sgst;
            }

            return mappedRow;
        });
    },

    /**
     * Provides appropriate empty values based on key names
     */
    getDefaultValue(key) {
        const numericFields = ['taxable_value', 'igst', 'cgst', 'sgst', 'tax_amount'];
        if (numericFields.includes(key)) return 0;
        return "";
    },

    /**
     * Orchestrates mapping for all global datasets
     */
    runMapping() {
        console.log("Starting Schema Mapping...");

        if (window.GST_DATA.sales.length > 0) {
            window.GST_DATA.sales = this.mapToSchema(
                window.GST_DATA.sales, 
                this.schemas.SALES_MASTER
            );
        }

        if (window.GST_DATA.purchase.length > 0) {
            window.GST_DATA.purchase = this.mapToSchema(
                window.GST_DATA.purchase, 
                this.schemas.PURCHASE_MASTER
            );
        }

        if (window.GST_DATA.gstr2b.length > 0) {
            window.GST_DATA.gstr2b = this.mapToSchema(
                window.GST_DATA.gstr2b, 
                this.schemas.GSTR2B_MASTER
            );
        }

        console.log("Mapping Complete", window.GST_DATA);
        return window.GST_DATA;
    }
};

export default MapperModule;
