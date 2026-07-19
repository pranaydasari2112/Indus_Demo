BUSINESS_GLOSSARY = """
PROCUREMENT BUSINESS GLOSSARY & SCHEMA RULES (CSV MAPPED):

1. TARGET DB TYPE: SQLite

2. REFERENCING CURRENT DATE / ANCHOR DATE:
   - Crucial: The analytical reference date for this dataset is '2026-07-16' (matching the `as_of_date` column in the data).
   - All relative date operations must be anchored to '2026-07-16'.
   - Do NOT use dynamic SQLite functions like `date('now')` or `julianday('now')` for date calculations.
   - Example (monthly PO spend trend for the last 6 months): `po_date >= date('2026-07-16', '-6 month')`
   - Example (PO date comparisons): `julianday('2026-07-16') - julianday(po_date)`

3. CORE TERMINOLOGY MAPS (SINGLE TABLE: `purchase_orders`):
   - "PO" or "Purchase Order": Maps to the table `purchase_orders`.
   - "Open POs": Records where `po_status IN ('Open', 'Partially Fulfilled')` (or `open_po_amount_inr > 0`).
   - "Closed POs" / "Fulfilled POs": Records where `po_status IN ('Fully Fulfilled', 'Finally Closed')`.
   - "Outstanding Commitment" or "Pending Procurement Value": Sum of the column `open_po_amount_inr`.
     * To find top vendors by outstanding commitment: `SELECT vendor_name, SUM(open_po_amount_inr) FROM purchase_orders WHERE po_status IN ('Open', 'Partially Fulfilled') GROUP BY vendor_name ORDER BY SUM(open_po_amount_inr) DESC`
   - "PO Value" or "Spend": Column `po_line_amount_inr` (grand total line value in INR).
   - "Circle" or "State": Column `circle` or `state_name` (e.g. Maharashtra, Madhya Pradesh, Tamil Nadu, Karnataka, Andhra Pradesh).
   - "Region": Column `region_name` (e.g. West, Central, South).
   - "City": Column `city_name`.
   - "Vendor": Column `vendor_name` (e.g. Zenith Power Solutions, Skyline Passive Infra Solutions, CoreLink Equipment India).
   - "Material vs Service": Column `material_service` ('Material' or 'Service') or `po_type` ('Service' or 'Supply').
   - "Material Category": Column `item_head`, `item_sub`, or `item_sub_sub` (e.g. 'Installation Services', 'Transmission', 'Power Equipment').
   - "Quantity Ordered": Column `quantity_ordered`.
   - "Quantity Received": Column `quantity_received_line_total`.
   - "Quantity Billed": Column `quantity_billed_to_date`.
   - "Quantity Open": Column `quantity_open_line_total`.
   - "PO Ageing Days" (Open PO duration): Column `po_ageing_days` (indicates how many days a PO has been open).
   - "Open more than 90 days": Column `po_ageing_days > 90` (or `julianday('2026-07-16') - julianday(po_date) > 90` when status is open). In this dataset, `po_ageing_days` contains precomputed open ageing days relative to `2026-07-16`, so you should prefer querying `po_ageing_days > 90` directly for open POs!
   - "Delayed POs": POs where `delayed_po_flag = 'Y'`.
   - "Delivery Delay Days": Column `delivery_delay_days` (represents delivery delay in days).
   - "Payment Status": Column `payment_status` (values: 'Paid', 'Overdue', 'On Hold', 'Not Due').
   - "Invoice Status": Column `invoice_status` (values: 'Paid', 'Booked', 'Approved', 'On Hold', 'Not Invoiced').
   - "Three-Way Match Status": Column `three_way_match_status` (values: 'Matched', 'Quantity Variance', 'Price Variance', 'Not Applicable').

4. INGESTED SCHEMA DEFINITION:
   - The SQLite table `purchase_orders` contains 92 columns mapped directly from the source CSV.
   - All text columns are `TEXT`, and numeric columns are `REAL` or `INTEGER`.
   - Use correct aggregate functions (`SUM`, `AVG`, `COUNT(DISTINCT ...)`) when querying.
   - Avoid joins unless querying distinct entities or combining dimensions, as all fields reside in `purchase_orders`.
"""
