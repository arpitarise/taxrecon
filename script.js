/**
 * UI MODULE
 * Handles DOM updates
 */
const UIModule = {
    updateFileList(files) {
        const list = document.getElementById('file-list');
        if (files.length === 0) {
            list.innerHTML = '<li class="empty-msg">No files uploaded yet.</li>';
            return;
        }

        list.innerHTML = '';
        files.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'file-item';
            li.innerHTML = `
                <span>📄 ${file.name} <small>(${(file.size / 1024).toFixed(1)} KB)</small></span>
                <span style="color: var(--success)">✓ Ready</span>
            `;
            list.appendChild(li);
        });
    },

    log(message) {
        const logger = document.getElementById('status-log');
        const timestamp = new Date().toLocaleTimeString();
        logger.innerText = `[${timestamp}] ${message}`;
    }
};

/**
 * FILE HANDLING MODULE
 */
const FileModule = {
    uploadedFiles: [],

    handleFiles(files) {
        const validExtensions = ['json', 'xlsx'];
        
        Array.from(files).forEach(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            if (validExtensions.includes(ext)) {
                this.uploadedFiles.push(file);
                UIModule.log(`Uploaded: ${file.name}`);
            } else {
                UIModule.log(`Error: ${file.name} is not a valid format.`);
            }
        });

        UIModule.updateFileList(this.uploadedFiles);
    }
};

/**
 * ACTION MODULE
 * Orchestrates processing logic
 */
const ActionModule = {
    init() {
        document.getElementById('btn-clean').onclick = () => this.process('Cleaning data sets...');
        document.getElementById('btn-map').onclick = () => this.process('Mapping schema columns...');
        document.getElementById('btn-validate').onclick = () => this.process('Validating data integrity...');
        document.getElementById('btn-reconcile').onclick = () => this.process('Reconciling accounts...');
        document.getElementById('btn-gst').onclick = () => this.process('Generating GST reports...');
        document.getElementById('btn-export').onclick = () => this.process('Exporting processed JSON...');
    },

    process(actionName) {
        if (FileModule.uploadedFiles.length === 0) {
            UIModule.log('Error: Please upload files first');
            return;
        }
        UIModule.log(`Action: ${actionName}`);
        // Here you would typically call a backend or a heavy parsing library
    }
};

/**
 * CORE APP INITIALIZATION
 */
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    // Trigger file dialog
    dropZone.onclick = () => fileInput.click();

    // Drag and Drop listeners
    dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    };

    dropZone.ondragleave = () => {
        dropZone.classList.remove('drag-over');
    };

    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        FileModule.handleFiles(e.dataTransfer.files);
    };

    // Manual file input listener
    fileInput.onchange = (e) => {
        FileModule.handleFiles(e.target.files);
    };

    // Initialize button actions
    ActionModule.init();
});




/**
 * script.js - Application Entry Point & Orchestrator
 */

// Import Modules
import UploadModule from './upload.js';
import CleanerModule from './cleaner.js';
import MapperModule from './mapper.js';
import ValidatorModule from './validator.js';
import ReconcileModule from './reconcile.js';
import GSTEngineModule from './gst_engine.js';
import ReportGeneratorModule from './report_generator.js';
import ExportModule from './export.js';

// Local State for results that don't belong in global GST_DATA
let validationReport = null;
let reconciliationResult = null;
let finalTaxReport = null;

const App = {
    init() {
        this.bindEvents();
        this.log("System Ready. Please upload files.");
    },

    bindEvents() {
        // File Upload Elements
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');

        dropZone.onclick = () => fileInput.click();
        fileInput.onchange = (e) => this.handleUpload(e.target.files);

        // Drag & Drop
        dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); };
        dropZone.ondragleave = () => dropZone.classList.remove('drag-over');
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            this.handleUpload(e.dataTransfer.files);
        };

        // Action Buttons
        document.getElementById('btn-clean').onclick = () => this.runCleaning();
        document.getElementById('btn-map').onclick = () => this.runMapping();
        document.getElementById('btn-validate').onclick = () => this.runValidation();
        document.getElementById('btn-reconcile').onclick = () => this.runReconciliation();
        document.getElementById('btn-gst').onclick = () => this.runGSTGeneration();
        document.getElementById('btn-export').onclick = () => this.runExport();
    },

    /**
     * WORKFLOW STEP 1: UPLOAD
     */
    async handleUpload(files) {
        try {
            this.log("Uploading and parsing files...");
            await UploadModule.processFiles(files);
            this.updateUIFileList();
            this.log(`Files uploaded: Sales(${window.GST_DATA.sales.length}), Purchase(${window.GST_DATA.purchase.length}), 2B(${window.GST_DATA.gstr2b.length})`);
        } catch (err) {
            this.log("Upload Error: " + err.message);
        }
    },

    /**
     * WORKFLOW STEP 2: CLEAN
     */
    runCleaning() {
        if (!this.checkData()) return;
        CleanerModule.cleanAll();
        this.log("Data cleaned: Dates standardized, empty rows removed, and spaces trimmed.");
    },

    /**
     * WORKFLOW STEP 3: MAP
     */
    runMapping() {
        if (!this.checkData()) return;
        MapperModule.runMapping();
        this.log("Columns mapped to Standard Schema (Sales Master / Purchase Master).");
    },

    /**
     * WORKFLOW STEP 4: VALIDATE
     */
    runValidation() {
        if (!this.checkData()) return;
        validationReport = ValidatorModule.runValidation();
        
        const errorCount = validationReport.sales.errors.length + validationReport.purchase.errors.length;
        if (errorCount > 0) {
            this.log(`Validation Complete: Found ${errorCount} errors. Exporting Error Report...`);
            ExportModule.exportErrorReport(validationReport);
        } else {
            this.log("Validation Passed: No critical errors found.");
        }
    },

    /**
     * WORKFLOW STEP 5: RECONCILE
     */
    runReconciliation() {
        if (window.GST_DATA.purchase.length === 0 || window.GST_DATA.gstr2b.length === 0) {
            this.log("Error: Reconciliation requires both Purchase Register and GSTR-2B.");
            return;
        }
        reconciliationResult = ReconcileModule.runReconciliation();
        this.log(`Reconciliation Done: ${reconciliationResult.summary.total_matched} Match, ${reconciliationResult.summary.total_mismatched} Mismatch.`);
        ExportModule.exportReconciliationReport(reconciliationResult.details);
    },

    /**
     * WORKFLOW STEP 6: COMPUTE GST & GENERATE JSON
     */
    runGSTGeneration() {
        if (!reconciliationResult) {
            this.log("Error: Please run Reconciliation before generating GST.");
            return;
        }
        
        // Compute Taxes
        const taxSummary = GSTEngineModule.computeGST(reconciliationResult.details);
        
        // Generate Govt-ready JSON Structure
        finalTaxReport = ReportGeneratorModule.generateFinalJSON(reconciliationResult.details);
        
        this.log(`GST Computed: Net Payable ${taxSummary.net_payable.total}. JSON Ready for export.`);
        alert(`Net GST Payable: ₹${taxSummary.net_payable.total}`);
    },

    /**
     * WORKFLOW STEP 7: EXPORT
     */
    runExport() {
        if (!finalTaxReport) {
            this.log("Error: Nothing to export. Run 'Generate GST' first.");
            return;
        }
        ExportModule.exportGSTR1(finalTaxReport.gstr1);
        this.log("Exported GSTR-1 JSON and GSTR-3B Summary.");
    },

    /**
     * HELPERS
     */
    checkData() {
        const hasData = window.GST_DATA.sales.length > 0 || window.GST_DATA.purchase.length > 0;
        if (!hasData) this.log("Error: No data found. Please upload files first.");
        return hasData;
    },

    log(msg) {
        const logger = document.getElementById('status-log');
        const timestamp = new Date().toLocaleTimeString();
        logger.innerText = `[${timestamp}] ${msg}`;
        console.log(`[LOG] ${msg}`);
    },

    updateUIFileList() {
        const list = document.getElementById('file-list');
        list.innerHTML = '';
        
        const categories = [
            { name: 'Sales Register', data: window.GST_DATA.sales },
            { name: 'Purchase Register', data: window.GST_DATA.purchase },
            { name: 'GSTR-2B Portal', data: window.GST_DATA.gstr2b }
        ];

        categories.forEach(cat => {
            if (cat.data.length > 0) {
                const li = document.createElement('li');
                li.className = 'file-item';
                li.innerHTML = `<span>📂 ${cat.name}</span> <strong>${cat.data.length} rows</strong>`;
                list.appendChild(li);
            }
        });

        if (list.innerHTML === '') {
            list.innerHTML = '<li class="empty-msg">No files uploaded yet.</li>';
        }
    }
};

// Start App
document.addEventListener('DOMContentLoaded', () => App.init());
