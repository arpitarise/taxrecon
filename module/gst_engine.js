/**
 * gst_engine.js - Tax Computation & Liability Engine
 */

const GSTEngineModule = {
    /**
     * Main calculation orchestrator
     * @param {Array} reconciledDetails - The 'details' array from ReconcileModule
     */
    computeGST(reconciledDetails) {
        const sales = window.GST_DATA.sales || [];
        const purchases = window.GST_DATA.purchase || [];

        const outputTax = this.calculateOutputTax(sales);
        const itc = this.calculateITC(purchases, reconciledDetails);
        const netPayable = this.calculateNetPayable(outputTax, itc);

        const finalReport = {
            output_tax: outputTax,
            itc: itc,
            net_payable: netPayable
        };

        console.log("GST Computation Complete:", finalReport);
        return finalReport;
    },

    /**
     * Sums up all taxes from the Sales Master
     */
    calculateOutputTax(sales) {
        return sales.reduce((acc, curr) => {
            acc.igst += parseFloat(curr.igst) || 0;
            acc.cgst += parseFloat(curr.cgst) || 0;
            acc.sgst += parseFloat(curr.sgst) || 0;
            acc.total += (parseFloat(curr.igst) || 0) + (parseFloat(curr.cgst) || 0) + (parseFloat(curr.sgst) || 0);
            return acc;
        }, { igst: 0, cgst: 0, sgst: 0, total: 0 });
    },

    /**
     * Sums up ITC only for invoices that have a "MATCHED" status in reconciliation
     */
    calculateITC(purchases, reconciledDetails) {
        // Create a set of matched invoice numbers for quick lookup
        const matchedInvoices = new Set(
            reconciledDetails
                .filter(item => item.status === "MATCHED")
                .map(item => item.invoice_no)
        );

        // Filter original purchase records by the matched set
        return purchases.reduce((acc, curr) => {
            if (matchedInvoices.has(curr.invoice_no)) {
                acc.igst += parseFloat(curr.igst) || 0;
                acc.cgst += parseFloat(curr.cgst) || 0;
                acc.sgst += parseFloat(curr.sgst) || 0;
                acc.total += (parseFloat(curr.igst) || 0) + (parseFloat(curr.cgst) || 0) + (parseFloat(curr.sgst) || 0);
            }
            return acc;
        }, { igst: 0, cgst: 0, sgst: 0, total: 0 });
    },

    /**
     * Calculates Net GST Payable (Output - ITC)
     */
    calculateNetPayable(output, itc) {
        const igstPayable = Math.max(0, output.igst - itc.igst);
        const cgstPayable = Math.max(0, output.cgst - itc.cgst);
        const sgstPayable = Math.max(0, output.sgst - itc.sgst);

        // Standard JS rounding to avoid floating point issues
        return {
            igst: parseFloat(igstPayable.toFixed(2)),
            cgst: parseFloat(cgstPayable.toFixed(2)),
            sgst: parseFloat(sgstPayable.toFixed(2)),
            total: parseFloat((igstPayable + cgstPayable + sgstPayable).toFixed(2))
        };
    },

    /**
     * Helper to format values for display in UI
     */
    formatCurrency(val) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(val);
    }
};

export default GSTEngineModule;
