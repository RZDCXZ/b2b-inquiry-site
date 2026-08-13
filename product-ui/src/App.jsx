import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  BellSimple,
  BookOpenText,
  CalendarBlank,
  CaretDown,
  Check,
  CheckCircle,
  ClipboardText,
  Clock,
  DownloadSimple,
  Engine,
  EnvelopeSimple,
  FileArrowUp,
  FileText,
  Funnel,
  GearSix,
  Globe,
  House,
  Info,
  List,
  LockKey,
  MagnifyingGlass,
  NotePencil,
  Package,
  PaperPlaneTilt,
  PencilSimpleLine,
  Plus,
  Prohibit,
  Quotes,
  Rows,
  ShieldCheck,
  SignOut,
  SlidersHorizontal,
  Table,
  Tag,
  Timer,
  Trash,
  UserCircle,
  UsersThree,
  Warning,
  Wrench,
  X,
  XCircle,
} from "@phosphor-icons/react";

const categories = [
  { name: "Fuel Filters", detail: "Protect fuel systems", icon: Funnel },
  { name: "Oil Filters", detail: "Keep engines clean", icon: Engine },
  { name: "Air Filters", detail: "Optimize airflow", icon: SlidersHorizontal },
  { name: "Cabin Filters", detail: "Improve cabin air", icon: Rows },
];

const inquiries = [
  { ref: "TQI-7K4P-92MX", company: "Harborline Fleet Parts", country: "Singapore", product: "TQ-FL-4827", status: "待分配", owner: "—", source: "产品详情", time: "08-13 09:42", next: "今天" },
  { ref: "TQI-5N8C-41QZ", company: "Northport Diesel Supply", country: "Australia", product: "TQ-AF-2106", status: "跟进中", owner: "林婧", source: "车型查找", time: "08-12 16:18", next: "今天" },
  { ref: "TQI-2B6R-18WK", company: "Meridian Truck Works", country: "UAE", product: "TQ-OF-1038", status: "已报价", owner: "周程", source: "编号查找", time: "08-11 11:07", next: "08-15" },
  { ref: "TQI-9D3M-77LA", company: "Pioneer Fleet Care", country: "Malaysia", product: "—", status: "已分配", owner: "林婧", source: "通用询盘", time: "08-10 14:31", next: "08-14" },
];

const importErrors = [
  { sheet: "规格值", row: 18, field: "rated_flow", code: "SPEC_UNIT_MISMATCH", issue: "单位 L/h 与属性定义 L/min 不一致", fix: "将单位改为 L/min，或换算后重新上传" },
  { sheet: "翻译", row: 27, field: "name_zh_cn", code: "REQUIRED_TRANSLATION", issue: "中文产品名称为空", fix: "补充简体中文产品名称" },
  { sheet: "适配关系", row: 42, field: "engine", code: "UNKNOWN_ENGINE", issue: "发动机 N13-425 不在固定数据中", fix: "使用 N13-420 或检查拼写" },
];

function useRoute() {
  const [route, setRoute] = useState(() => window.location.pathname || "/");
  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname || "/");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const go = (path) => {
    window.history.pushState({}, "", path);
    setRoute(path);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  return [route, go];
}

function Button({ children, kind = "primary", icon: Icon = ArrowRight, onClick, type = "button", disabled = false, className = "" }) {
  return (
    <button type={type} className={`button button--${kind} ${className}`} onClick={onClick} disabled={disabled}>
      <span>{children}</span>{Icon && <Icon size={19} weight="bold" aria-hidden="true" />}
    </button>
  );
}

function Status({ children, tone = "neutral" }) {
  return <span className={`status status--${tone}`}><span className="status__dot" />{children}</span>;
}

function Field({ label, value, placeholder, type = "text", onChange, required = false, optional = false, children, error }) {
  return (
    <label className={`field ${error ? "field--error" : ""}`}>
      <span className="field__label">{label} {(required || optional) && <small>{required ? "Required" : "Optional"}</small>}</span>
      {children || <input type={type} value={value} placeholder={placeholder} onChange={onChange} />}
      {error && <span className="field__error"><Warning size={15} weight="fill" />{error}</span>}
    </label>
  );
}

function SelectField({ label, value, options = [], onChange, required = false }) {
  return (
    <label className="field">
      <span className="field__label">{label} <small>{required ? "Required" : ""}</small></span>
      <span className="select-wrap">
        <select value={value} onChange={onChange || (() => {})}>{options.map((option) => <option key={option}>{option}</option>)}</select>
        <CaretDown size={18} weight="bold" />
      </span>
    </label>
  );
}

function Brand({ admin = false, go }) {
  return (
    <button className={`brand ${admin ? "brand--admin" : ""}`} onClick={() => go(admin ? "/admin" : "/")} aria-label="Torquelis home">
      TORQUELIS{admin && <small>询盘运营</small>}
    </button>
  );
}

function PublicHeader({ go }) {
  const [open, setOpen] = useState(false);
  const path = window.location.pathname;
  const items = [
    { label: "Products", path: "/products", active: path === "/products" || path === "/product" },
    { label: "Private Label", path: "/private-label", active: path === "/private-label" },
    { label: "Manufacturing & Quality", path: "/quality", active: path === "/quality" },
    { label: "Technical Resources", path: "/resources", active: path.startsWith("/resources") },
    { label: "About", path: "/about", active: path === "/about" },
    { label: "Contact", path: "/inquiry", active: path === "/inquiry" || path === "/success" },
  ];
  return (
    <header className="public-header">
      <Brand go={go} />
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X /> : <List />}</button>
      <nav className={open ? "is-open" : ""}>
        {items.map((item) => (
          <button
            key={item.path}
            className={item.active ? "active" : ""}
            aria-current={item.active ? "page" : undefined}
            onClick={() => go(item.path)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="locale-switch"><button className="active">EN</button><button>简中</button></div>
    </header>
  );
}

function PublicFooter({ go }) {
  return (
    <footer className="public-footer">
      <div><Brand go={go} /><p>Commercial vehicle filtration products and structured inquiries.</p></div>
      <div><b>Find products</b><button onClick={() => go("/products")}>Part & reference search</button><button onClick={() => go("/products")}>Vehicle application</button><button onClick={() => go("/products")}>Category & specifications</button></div>
      <div><b>Prototype</b><button onClick={() => go("/design-index")}>Design index</button><button onClick={() => go("/admin")}>运营后台</button><button onClick={() => go("/privacy")}>Privacy & demo data</button></div>
      <div className="demo-boundary"><Info size={20} weight="fill" /><p>Fictional demo manufacturer. All product and performance data are for demonstration only.</p></div>
    </footer>
  );
}

function PublicShell({ children, go, compact = false }) {
  return <div className={`public-shell ${compact ? "public-shell--compact" : ""}`}><PublicHeader go={go} />{children}<PublicFooter go={go} /></div>;
}

function SearchWorkbench({ go, initialTab = "part" }) {
  const [tab, setTab] = useState(initialTab);
  const [part, setPart] = useState("TQ-FL-4827");
  const tabs = [["part", "PART / REFERENCE"], ["vehicle", "VEHICLE"], ["specs", "CATEGORY & SPECS"]];
  return (
    <section className="search-workbench" aria-label="Product finder">
      <div className="search-tabs" role="tablist">
        {tabs.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {tab === "part" && <div className="search-panel">
        <Field label="Part or reference number" value={part} onChange={(e) => setPart(e.target.value)} />
        <Button onClick={() => go(part.toUpperCase().replaceAll("-", "") === "TQFL4827" ? "/product" : "/products")}>Find a filter</Button>
        <p className="helper">Search ignores case, spaces and hyphens. Cross-reference matches always open a results page.</p>
      </div>}
      {tab === "vehicle" && <div className="vehicle-panel">
        <SelectField label="Brand" value="Northline" options={["Northline", "Ardent", "Voltis"]} />
        <SelectField label="Model" value="HX9" options={["HX9", "HX7"]} />
        <SelectField label="Year" value="2022" options={["2022", "2021", "2020"]} />
        <SelectField label="Engine" value="N13-420" options={["N13-420"]} />
        <Button onClick={() => go("/products")}>Show matches</Button>
      </div>}
      {tab === "specs" && <div className="vehicle-panel">
        <SelectField label="Category" value="Fuel Filter" options={["Fuel Filter", "Air Filter", "Oil Filter", "Cabin Filter"]} />
        <SelectField label="Outer diameter" value="96 mm" options={["96 mm", "93 mm"]} />
        <SelectField label="Height" value="178 mm" options={["178 mm", "170 mm"]} />
        <Button onClick={() => go("/products")}>Apply specifications</Button>
      </div>}
      <button className="text-action search-secondary" onClick={() => go("/inquiry")}><EnvelopeSimple size={22} /> Send a general inquiry <ArrowRight size={18} /></button>
    </section>
  );
}

function HomePage({ go }) {
  return (
    <PublicShell go={go}>
      <main>
        <section className="home-hero">
          <div className="home-copy">
            <p className="eyebrow">COMMERCIAL VEHICLE FILTRATION</p>
            <h1>Find the right filter,<br />without the guesswork.</h1>
            <p className="lede">Search Torquelis part numbers, cross-references or commercial vehicle applications, then send a structured inquiry with the product context attached.</p>
            <SearchWorkbench go={go} />
          </div>
          <figure className="hero-visual"><img src="/assets/hero-filter-cutaway.png" alt="Fuel filter cutaway with dimensions and fluid path annotations" /></figure>
        </section>
        <section className="category-index">
          {categories.map(({ name, detail, icon: Icon }) => <button key={name} onClick={() => go("/products")}><Icon size={48} weight="thin" /><span><b>{name}</b><small>{detail}<br />and verify fitment.</small></span></button>)}
        </section>
        <section className="process-band">
          <div><p className="eyebrow">FROM FITMENT TO FOLLOW-UP</p><h2>A product context that stays attached.</h2></div>
          {["Find", "Verify", "Inquire"].map((step, index) => <article key={step}><span>0{index + 1}</span><h3>{step}</h3><p>{["Use a part number, vehicle application or exact specifications.", "Compare fitment, dimensions and clearly separated cross-references.", "Send a structured request without re-entering the product context."][index]}</p></article>)}
        </section>
        <section className="family-band"><img src="/assets/filter-family.png" alt="Four commercial vehicle filter categories" /><div><p className="eyebrow">ONE MAINTAINED CATALOGUE</p><h2>Four filtration categories. One reliable information model.</h2><p>Specifications, fitment, cross-references and bilingual content are maintained as structured product data.</p><Button kind="secondary" onClick={() => go("/products")}>Explore products</Button></div></section>
      </main>
    </PublicShell>
  );
}

function ProductFinderPage({ go }) {
  const [mode, setMode] = useState("vehicle");
  const [unit, setUnit] = useState("Metric");
  const [empty, setEmpty] = useState(false);
  return (
    <PublicShell go={go} compact>
      <main className="finder-page">
        <div className="page-heading"><div><p className="eyebrow">PRODUCT FINDER / VEHICLE APPLICATION</p><h1>Narrow the catalogue with exact context.</h1></div><p>Filters and unit preferences are encoded in the URL for a shareable, stable result.</p></div>
        <div className="finder-layout">
          <aside className="filter-panel">
            <div className="search-tabs compact-tabs">{[["part", "PART"], ["vehicle", "VEHICLE"], ["specs", "SPECS"]].map(([id, label]) => <button key={id} aria-selected={mode === id} onClick={() => setMode(id)}>{label}</button>)}</div>
            <h2>Vehicle & specifications</h2>
            <SelectField label="Commercial vehicle brand" value="Northline" options={["Northline", "Ardent"]} />
            <SelectField label="Model" value="HX9" options={["HX9"]} />
            <div className="field-pair"><SelectField label="Year" value="2022" options={["2022"]} /><SelectField label="Engine" value="N13-420" options={["N13-420"]} /></div>
            <SelectField label="Category" value="Fuel Filter" options={["Fuel Filter"]} />
            <div className="field-pair"><SelectField label="Outer diameter" value={empty ? "93 mm" : "96 mm"} options={["96 mm", "93 mm"]} /><SelectField label="Height" value="178 mm" options={["178 mm"]} /></div>
            <div className="unit-toggle"><button className={unit === "Metric" ? "active" : ""} onClick={() => setUnit("Metric")}>Metric</button><button className={unit === "Imperial" ? "active" : ""} onClick={() => setUnit("Imperial")}>Imperial</button></div>
            <Button onClick={() => setEmpty(false)}>Update results</Button>
          </aside>
          <section className="results-panel">
            <div className="results-header"><div><p className="eyebrow">MATCHED BY VEHICLE + SPECIFICATIONS</p><h2>{empty ? "No matches found" : "1 match found"}</h2></div><span>Sorted by Torquelis part number</span></div>
            <div className="active-filters"><span>Northline HX9 <X size={14} /></span><span>2022 <X size={14} /></span><span>N13-420 <X size={14} /></span><span>Fuel Filter <X size={14} /></span></div>
            {empty ? <div className="empty-state"><MagnifyingGlass size={46} weight="thin" /><h3>No products match every condition.</h3><p>Your filters are preserved. Clear a specification, search by number, or send a general inquiry.</p><div><Button onClick={() => setEmpty(false)}>Clear specifications</Button><Button kind="secondary" onClick={() => go("/inquiry")}>General inquiry</Button></div></div> : <article className="result-product">
              <div className="product-image"><img src="/assets/fuel-filter-product.png" alt="TQ-FL-4827 fuel filter" /></div>
              <div className="result-body"><p className="micro">FUEL FILTER</p><h3 className="part-number">TQ-FL-4827</h3><h4>High-Efficiency Fuel Filter</h4><p className="fitment"><Engine size={18} /> Northline HX9 · 2019–2024 · N13-420</p><dl><div><dt>Outer diameter</dt><dd>{unit === "Metric" ? "96 mm" : "3.78 in converted"}</dd></div><div><dt>Height</dt><dd>{unit === "Metric" ? "178 mm" : "7.01 in converted"}</dd></div><div><dt>Filtration</dt><dd>10 μm</dd></div><div><dt>Rated flow</dt><dd>{unit === "Metric" ? "5.2 L/min" : "1.37 gal/min converted"}</dd></div></dl><div className="local-demo"><Info size={18} /> Demo data — not for selection or purchasing.</div><div className="result-actions"><Button onClick={() => go("/product")}>View product</Button><Button kind="secondary" onClick={() => go("/inquiry")}>Send inquiry</Button></div></div>
            </article>}
            <button className="subtle-link" onClick={() => setEmpty(!empty)}>Preview {empty ? "matching" : "no-result"} state</button>
          </section>
        </div>
      </main>
    </PublicShell>
  );
}

function ProductPage({ go }) {
  const [unit, setUnit] = useState("Metric");
  const [discontinued, setDiscontinued] = useState(false);
  return (
    <PublicShell go={go} compact>
      <main className="product-page">
        <div className="breadcrumbs"><button onClick={() => go("/")}>Home</button><span>/</span><button onClick={() => go("/products")}>Fuel Filters</button><span>/</span><b>TQ-FL-4827</b></div>
        {discontinued && <div className="persistent-banner persistent-banner--warning"><Warning weight="fill" /><div><b>This product is discontinued.</b><p>The URL, specifications and inquiry history remain available. Replacement: <button>TQ-FL-4920</button>.</p></div></div>}
        <section className="product-hero">
          <div className="product-photo"><img src="/assets/fuel-filter-product.png" alt="High-Efficiency Fuel Filter TQ-FL-4827" /><span>FUEL FILTER</span></div>
          <div className="product-summary"><div className="summary-top"><p className="eyebrow">TORQUELIS PART NUMBER</p><Status tone={discontinued ? "warning" : "success"}>{discontinued ? "Discontinued" : "Published"}</Status></div><h1 className="part-number">TQ-FL-4827</h1><h2>High-Efficiency Fuel Filter</h2><p>Designed as a standard replacement filter for selected Northline commercial vehicle applications.</p><div className="unit-toggle"><button className={unit === "Metric" ? "active" : ""} onClick={() => setUnit("Metric")}>Metric</button><button className={unit === "Imperial" ? "active" : ""} onClick={() => setUnit("Imperial")}>Imperial</button></div><dl className="key-specs"><div><dt>Outer diameter</dt><dd>{unit === "Metric" ? "96 mm" : "3.78 in"}</dd></div><div><dt>Height</dt><dd>{unit === "Metric" ? "178 mm" : "7.01 in"}</dd></div><div><dt>Filtration</dt><dd>10 μm</dd></div><div><dt>Rated flow</dt><dd>{unit === "Metric" ? "5.2 L/min" : "1.37 gal/min"}</dd></div></dl><div className="local-demo"><Info size={18} weight="fill" /> Demo data — not for selection or purchasing.</div><div className="product-actions"><Button onClick={() => go("/inquiry")}>Inquire about this product</Button><Button kind="secondary" icon={DownloadSimple} onClick={() => alert("Demo specification PDF prepared with watermark.")}>Download specification PDF</Button></div></div>
        </section>
        <section className="product-data-grid"><article><p className="eyebrow">APPLICATION SUMMARY</p><h2>Verified fitment context</h2><div className="data-table"><div className="data-row data-row--head"><b>Brand</b><b>Model</b><b>Years</b><b>Engine</b></div><div className="data-row"><span>Northline</span><span>HX9</span><span>2019–2024</span><span>N13-420</span></div></div></article><article><p className="eyebrow">CROSS-REFERENCES</p><h2>Numbers from fictional brands</h2><div className="data-table"><div className="data-row data-row--head two"><b>Fictional brand</b><b>Reference number</b></div><div className="data-row two"><span>Novera</span><code>NFX-9081</code></div><div className="data-row two"><span>Arvento</span><code>ARV-7710</code></div></div><p className="table-note">Cross-references are not Torquelis product numbers.</p></article></section>
        <section className="prototype-state-switch"><span>Design state:</span><button onClick={() => setDiscontinued(false)} className={!discontinued ? "active" : ""}>Published</button><button onClick={() => setDiscontinued(true)} className={discontinued ? "active" : ""}>Discontinued + replacement</button></section>
      </main>
    </PublicShell>
  );
}

function InquiryPage({ go }) {
  const [values, setValues] = useState({ name: "", email: "", company: "", country: "Singapore", quantity: "240 pcs", message: "We are evaluating a replacement filter for our Northline HX9 fleet.", consent: false });
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? { name: !values.name && "Enter your name", email: !values.email.includes("@") && "Enter a valid work email", company: !values.company && "Enter your company", consent: !values.consent && "Privacy consent is required" } : {};
  const change = (key) => (e) => setValues((current) => ({ ...current, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const submit = (e) => { e.preventDefault(); setSubmitted(true); if (values.name && values.email.includes("@") && values.company && values.consent) go("/success"); };
  return (
    <PublicShell go={go} compact>
      <main className="inquiry-page"><div className="page-heading"><div><p className="eyebrow">PRODUCT INQUIRY</p><h1>Send the product context with your request.</h1></div><p>This is an inquiry, not an order or official quotation.</p></div><div className="inquiry-layout"><aside className="context-card"><p className="micro">PRODUCT CONTEXT · READ ONLY</p><img src="/assets/fuel-filter-product.png" alt="TQ-FL-4827" /><h2 className="part-number">TQ-FL-4827</h2><p>High-Efficiency Fuel Filter</p><dl><div><dt>Category</dt><dd>Fuel Filter</dd></div><div><dt>Application</dt><dd>Northline HX9</dd></div></dl><button onClick={() => go("/product")}><ArrowLeft /> Return to product</button></aside><form className="inquiry-form" onSubmit={submit}>{submitted && Object.values(errors).some(Boolean) && <div className="error-summary" tabIndex="-1"><XCircle size={22} weight="fill" /><div><b>Check 4 required fields</b><p>Review the highlighted labels below, then send the inquiry again.</p></div></div>}<div className="form-grid"><Field label="Name" required value={values.name} onChange={change("name")} error={errors.name} /><Field label="Work email" required value={values.email} onChange={change("email")} error={errors.email} /><Field label="Company" required value={values.company} onChange={change("company")} error={errors.company} /><SelectField label="Country or region" required value={values.country} options={["Singapore", "Australia", "Malaysia", "United Arab Emirates"]} onChange={change("country")} /><Field label="Phone or WhatsApp" placeholder="+65 …" /><Field label="Expected purchase quantity" required value={values.quantity} onChange={change("quantity")} /></div><div className="choice-row"><label><input type="checkbox" /> <span>Private label needed</span></label><label><input type="checkbox" /> <span>Custom packaging needed</span></label></div><Field label="Message" required><textarea rows="6" value={values.message} onChange={change("message")} /></Field><label className={`consent ${errors.consent ? "has-error" : ""}`}><input type="checkbox" checked={values.consent} onChange={change("consent")} /><span>I agree to the privacy and demo data notice. <small>Required</small>{errors.consent && <b>{errors.consent}</b>}</span></label><div className="form-submit"><Button type="submit" icon={PaperPlaneTilt}>Send inquiry</Button><p>We store the source page, product and interface language with this inquiry.</p></div></form></div></main>
    </PublicShell>
  );
}

function SuccessPage({ go }) {
  return <PublicShell go={go} compact><main className="success-page"><CheckCircle size={58} weight="thin" /><p className="eyebrow">INQUIRY RECEIVED</p><h1>Your request is now in the demo workflow.</h1><div className="receipt"><span>Inquiry reference</span><strong>TQI-7K4P-92MX</strong><span>Related product</span><strong>TQ-FL-4827</strong></div><p>Our demo workflow will route this inquiry to an assigned sales representative. No contact details or message content are shown on this page.</p><div><Button onClick={() => go("/product")}>Return to product</Button><Button kind="secondary" onClick={() => go("/products")}>Find another filter</Button></div></main></PublicShell>;
}

function MarketingPage({ go, route }) {
  const content = {
    "/private-label": ["PRIVATE LABEL", "A structured path from product context to packaging needs.", "Capture private-label and packaging requirements alongside the exact filter—not in a disconnected contact form."],
    "/quality": ["MANUFACTURING & QUALITY", "Methods explained without unverifiable claims.", "This demo focuses on maintainable content structures, technical explanations and clear trust boundaries."],
    "/resources": ["TECHNICAL RESOURCES", "Technical notes written for product decisions.", "Browse fictional editorial topics about fitment, specification units, replacement numbers and maintenance context."],
    "/about": ["ABOUT TORQUELIS", "A fictional manufacturer with a very real information problem.", "Torquelis demonstrates how structured product data connects overseas procurement to an accountable inquiry workflow."],
    "/privacy": ["PRIVACY & DEMO DATA", "A local portfolio demo with visible trust boundaries.", "All business data is fictional. Notifications are captured locally, indexing is disabled by default, and no third-party analytics or marketing cookies are used."],
  }[route] || ["NOT FOUND", "This page is not part of the current demo path.", "Return to the product finder or send a general inquiry."];
  return <PublicShell go={go} compact><main className="editorial-page"><p className="eyebrow">{content[0]}</p><h1>{content[1]}</h1><p className="lede">{content[2]}</p><div className="editorial-rule" /><section><h2>What this design proves</h2><p>The page uses predefined, editorial sections rather than an unrestricted page builder. Bilingual publishing and immutable versions remain visible in the operations workspace.</p></section><Button onClick={() => go("/products")}>Open product finder</Button></main></PublicShell>;
}

const adminNav = [
  { label: "总览", path: "/admin", icon: House }, { label: "询盘工作台", path: "/admin/inquiries", icon: ClipboardText }, { label: "通知发件箱", path: "/admin/outbox", icon: BellSimple }, { label: "产品内容", path: "/admin/products", icon: Package }, { label: "批量导入", path: "/admin/import", icon: FileArrowUp }, { label: "内容发布", path: "/admin/content", icon: BookOpenText }, { label: "站点配置", path: "/admin/settings", icon: GearSix }, { label: "审计日志", path: "/admin/audit", icon: ShieldCheck },
];

function AdminShell({ children, go, route }) {
  const [open, setOpen] = useState(false);
  return <div className="admin-shell"><aside className={`admin-sidebar ${open ? "is-open" : ""}`}><Brand admin go={go} /><nav>{adminNav.map(({ label, path, icon: Icon }) => <button key={path} className={route === path || (path !== "/admin" && route.startsWith(path)) ? "active" : ""} onClick={() => { go(path); setOpen(false); }}><Icon size={20} />{label}</button>)}</nav><div className="admin-role"><UserCircle size={28} /><span><b>陈屿</b><small>管理员 · Asia/Shanghai</small></span><SignOut size={19} /></div></aside><div className="admin-main"><header className="admin-topbar"><button className="admin-menu" onClick={() => setOpen(!open)}><List /></button><div><span>本地演示环境</span><Status tone="neutral">通知仅捕获</Status></div><div><MagnifyingGlass /><BellSimple /><button onClick={() => go("/")}>查看采购前台 <ArrowSquareOut /></button></div></header>{children}</div></div>;
}

function AdminPageHeader({ eyebrow, title, description, action, actionIcon, onAction, children }) {
  return <div className="admin-page-header"><div><p className="admin-eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p>{description}</p>}</div><div className="admin-header-actions">{children}{action && <Button icon={actionIcon} onClick={onAction}>{action}</Button>}</div></div>;
}

function AdminDashboard({ go }) {
  return <AdminPage route="/admin" go={go}><AdminPageHeader eyebrow="2026 年 8 月 13 日 · 星期四" title="需要处理的工作" description="只显示可由本地演示数据库推导的运营待办。" /><section className="task-metrics">{[["待分配询盘", "3", "需要管理员处理", "warning"], ["今日到期跟进", "2", "1 项已经逾期", "danger"], ["已报价待处理", "4", "最近一项明日到期", "neutral"], ["最近导入批次", "B-028", "12 个草稿已更新", "success"]].map(([label, value, note, tone]) => <article key={label}><span className={`metric-mark metric-mark--${tone}`} /><p>{label}</p><strong>{value}</strong><small>{note}</small></article>)}</section><div className="admin-two-columns"><section className="admin-section"><div className="section-title"><div><p className="admin-eyebrow">优先队列</p><h2>需要处理</h2></div><button onClick={() => go("/admin/inquiries")}>全部询盘 <ArrowRight /></button></div><div className="priority-list">{inquiries.slice(0, 3).map((item, index) => <button key={item.ref} onClick={() => go("/admin/inquiries/TQI-7K4P-92MX")}><span className="priority-number">0{index + 1}</span><span><b>{item.company}</b><small>{item.ref} · {item.product}</small></span><Status tone={item.status === "待分配" ? "warning" : item.status === "已报价" ? "success" : "neutral"}>{item.status}</Status><span className="next-date">{item.next}</span><ArrowRight /></button>)}</div></section><aside className="admin-section status-breakdown"><div className="section-title"><div><p className="admin-eyebrow">状态摘要</p><h2>询盘流转</h2></div></div>{[["待分配", 3, 20], ["已分配", 5, 34], ["跟进中", 4, 27], ["已报价", 2, 14], ["已关闭", 1, 7]].map(([label, count, width]) => <div className="bar-row" key={label}><span>{label}</span><div><i style={{ width: `${width}%` }} /></div><b>{count}</b></div>)}</aside></div><div className="admin-two-columns lower"><section className="admin-section"><div className="section-title"><div><p className="admin-eyebrow">内容运营</p><h2>最近导入与发布</h2></div></div><div className="compact-events"><div><FileArrowUp /><span><b>torquelis-products-2026-08.xlsx</b><small>12 个草稿更新 · 可撤销</small></span><time>10:24</time></div><div><BookOpenText /><span><b>产品 TQ-AF-2106 已发布</b><small>中英文版本 · 王晴</small></span><time>昨天</time></div></div></section><section className="admin-section"><div className="section-title"><div><p className="admin-eyebrow">演示边界</p><h2>可验证，不夸张</h2></div></div><p className="boundary-copy"><Info weight="fill" /> 没有流量、转化率、销售额或虚构增长数据。通知只表示“已捕获（本地模拟）”。</p></section></div></AdminPage>;
}

function AdminPage({ children, go, route }) { return <AdminShell go={go} route={route}><main className="admin-content">{children}</main></AdminShell>; }

function InquiryWorkbench({ go }) {
  const [view, setView] = useState("normal");
  return <AdminPage route="/admin/inquiries" go={go}><AdminPageHeader eyebrow="询盘运营 / 工作台" title={view === "spam" ? "垃圾询盘" : "询盘工作台"} description={view === "spam" ? "隔离记录不进入正常状态流转，也不触发通知。" : "按责任、状态与下一步定位需要处理的询盘。"} action="分配选中询盘" actionIcon={UsersThree} onAction={() => go("/admin/inquiries/TQI-7K4P-92MX")}><Button kind="secondary" icon={view === "spam" ? ClipboardText : Trash} onClick={() => setView(view === "spam" ? "normal" : "spam")}>{view === "spam" ? "返回正常询盘" : "垃圾询盘"}</Button></AdminPageHeader><section className="admin-section table-section"><div className="filter-toolbar"><label><MagnifyingGlass /><input placeholder="搜索参考号、公司或产品编号" /></label><button><SlidersHorizontal /> 状态：全部 <CaretDown /></button><button><UsersThree /> 负责人：全部 <CaretDown /></button><button><CalendarBlank /> 提交时间 <CaretDown /></button><button className="clear-filters">清除筛选</button></div>{view === "spam" ? <div className="admin-table"><div className="tr th"><span>询盘参考号</span><span>风险摘要</span><span>来源</span><span>隔离时间</span><span>操作</span></div><div className="tr"><code>TQI-4X7V-22JD</code><span>蜜罐字段非空 · 提交过快</span><span>通用询盘</span><span>08-13 08:21</span><button>审查</button></div></div> : <div className="admin-table"><div className="tr th inquiry-cols"><span>询盘参考号</span><span>公司 / 国家</span><span>产品编号</span><span>状态</span><span>当前负责人</span><span>来源</span><span>下一步</span></div>{inquiries.map((item) => <button className="tr inquiry-cols" key={item.ref} onClick={() => go("/admin/inquiries/TQI-7K4P-92MX")}><code>{item.ref}</code><span><b>{item.company}</b><small>{item.country}</small></span><code>{item.product}</code><Status tone={item.status === "待分配" ? "warning" : item.status === "已报价" ? "success" : "neutral"}>{item.status}</Status><span>{item.owner}</span><span>{item.source}</span><span className={item.next === "今天" ? "due" : ""}>{item.next}</span></button>)}</div>}<div className="table-footer"><span>显示 1–4，共 20 张询盘</span><div><button disabled><ArrowLeft /></button><button className="active">1</button><button>2</button><button>3</button><button><ArrowRight /></button></div></div></section></AdminPage>;
}

function InquiryDetail({ go }) {
  const [drawer, setDrawer] = useState(null);
  const [state, setState] = useState("quoted");
  if (state === "denied") return <AdminPage route="/admin/inquiries" go={go}><div className="denied-state"><LockKey size={52} weight="thin" /><p className="admin-eyebrow">权限已更新</p><h1>你不再是这张询盘的当前负责人。</h1><p>该询盘已重新分配给周程。旧负责人不能查看联系方式和内部记录；历史操作仍然保留。</p><Button onClick={() => go("/admin/inquiries")}>返回我的询盘</Button></div></AdminPage>;
  return <AdminPage route="/admin/inquiries" go={go}><AdminPageHeader eyebrow="询盘运营 / 询盘详情" title="TQI-7K4P-92MX" description="提交于 2026-08-13 09:42 · 英文前台 · 产品详情"><Button kind="secondary" icon={UsersThree} onClick={() => setState("denied")}>重新分配</Button><Button icon={Quotes} onClick={() => setDrawer("quote")}>追加报价</Button></AdminPageHeader><section className="inquiry-summary-strip"><div><span>状态</span><Status tone="success">已报价</Status></div><div><span>当前负责人</span><b>林婧</b></div><div><span>下一步日期</span><b className="due">2026-08-14</b></div><div><span>关闭结果</span><b>—</b></div><button onClick={() => setDrawer("close")}>关闭询盘</button></section><div className="detail-layout"><div><section className="admin-section detail-section"><p className="admin-eyebrow">采购需求</p><h2>Harborline Fleet Parts</h2><div className="detail-grid"><div><span>姓名</span><b>Alex Morgan</b></div><div><span>国家或地区</span><b>Singapore</b></div><div><span>工作邮箱</span><b>alex@harborline.example</b></div><div><span>电话 / WhatsApp</span><b>+65 6000 4827</b></div><div><span>预计采购量</span><b>240 pcs</b></div><div><span>目标市场</span><b>Southeast Asia</b></div></div><div className="message-block"><span>留言</span><p>We are evaluating a replacement filter for our Northline HX9 fleet. Please confirm fitment context and private-label lead time.</p></div></section><section className="admin-section linked-product"><div><img src="/assets/fuel-filter-product.png" alt="TQ-FL-4827" /><span><p className="admin-eyebrow">关联产品</p><h3>TQ-FL-4827</h3><p>High-Efficiency Fuel Filter · Northline HX9</p></span><button onClick={() => go("/product")}>查看前台 <ArrowSquareOut /></button></div></section></div><aside className="admin-section quick-actions"><p className="admin-eyebrow">追加不可变记录</p><h2>下一步动作</h2><button onClick={() => setDrawer("contact")}><PaperPlaneTilt /><span><b>追加联系记录</b><small>记录一次已发生的客户联系</small></span><ArrowRight /></button><button onClick={() => setDrawer("quote")}><Quotes /><span><b>追加报价记录</b><small>金额、币种、有效期与下一步</small></span><ArrowRight /></button><button onClick={() => setDrawer("note")}><NotePencil /><span><b>追加内部备注</b><small>历史不可编辑或删除</small></span><ArrowRight /></button></aside></div><section className="admin-section timeline"><div className="section-title"><div><p className="admin-eyebrow">不可变时间线</p><h2>已经发生了什么</h2></div><span><LockKey /> 历史只读</span></div>{[["报价记录", "林婧", "2026-08-13 15:26", "USD 2,880.00 · 有效至 2026-09-15", "已报价"], ["首次联系", "林婧", "2026-08-13 11:18", "通过工作邮箱确认了车型与预计采购量。", "跟进中"], ["分配", "陈屿", "2026-08-13 10:02", "从待分配转交给林婧。", "已分配"], ["询盘提交", "系统", "2026-08-13 09:42", "英文产品详情页 · TQ-FL-4827", "待分配"]].map(([type, actor, time, text, status]) => <article key={type}><span className="timeline-icon"><Clock /></span><div><div><b>{type}</b><time>{time}</time></div><p>{text}</p><small>{actor} · 状态更新为 {status}</small></div></article>)}</section>{drawer && <AdminDrawer type={drawer} onClose={() => setDrawer(null)} />}</AdminPage>;
}

function AdminDrawer({ type, onClose }) {
  const data = type === "quote" ? ["追加报价记录", "保存后询盘状态保持“已报价”，历史记录不可覆盖或删除。"] : type === "close" ? ["关闭询盘", "关闭需要选择结果；管理员可稍后重新打开。"] : type === "contact" ? ["追加联系记录", "首次联系会将询盘自动推进到“跟进中”。"] : ["追加内部备注", "更正通过追加新记录完成，不编辑历史。"];
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="admin-drawer" onMouseDown={(e) => e.stopPropagation()}><header><div><p className="admin-eyebrow">询盘 TQI-7K4P-92MX</p><h2>{data[0]}</h2><p>{data[1]}</p></div><button onClick={onClose}><X /></button></header>{type === "quote" && <><div className="field-pair"><label className="cn-field"><span>报价金额</span><input defaultValue="2880.00" /></label><label className="cn-field"><span>币种</span><select defaultValue="USD"><option>USD</option><option>EUR</option><option>CNY</option></select></label></div><label className="cn-field"><span>有效期</span><input type="date" defaultValue="2026-09-15" /></label></>}{type === "close" && <div className="radio-stack"><label><input type="radio" name="close" defaultChecked /> 成交</label><label><input type="radio" name="close" /> 未成交</label><label><input type="radio" name="close" /> 无效</label></div>}<label className="cn-field"><span>摘要</span><textarea rows="5" defaultValue={type === "quote" ? "已按 240 pcs 发送演示报价，等待确认包装要求。" : "记录本次操作的业务原因。"} /></label><label className="cn-field"><span>下一步日期</span><input type="date" defaultValue="2026-08-14" /></label><footer><Button kind="secondary" icon={null} onClick={onClose}>取消</Button><Button icon={Check} onClick={onClose}>追加记录</Button></footer></aside></div>;
}

function ImportFlow({ go, route }) {
  const [valid, setValid] = useState(route.includes("preview") ? false : null);
  const [imported, setImported] = useState(false);
  const [conflict, setConflict] = useState(false);
  if (imported) return <AdminPage route="/admin/import" go={go}><AdminPageHeader eyebrow="产品内容 / 批量导入 / 批次 B-029" title={conflict ? "整批撤销被拒绝" : "12 个草稿已更新"} description="导入只更新草稿，不自动改变公开内容。" />{conflict ? <section className="conflict-screen admin-section"><div className="persistent-banner persistent-banner--danger"><Prohibit weight="fill" /><div><b>2 个产品在导入后发生变化，不能整批撤销。</b><p>没有任何草稿被部分恢复。请逐项查看冲突，或使用发布版本恢复。</p></div></div><div className="admin-table"><div className="tr th"><span>产品编号</span><span>冲突类型</span><span>修改人</span><span>时间</span><span>下一步</span></div><div className="tr"><code>TQ-FL-4827</code><Status tone="warning">已发布</Status><span>王晴</span><span>08-13 14:28</span><button>查看产品</button></div><div className="tr"><code>TQ-AF-2106</code><Status tone="danger">继续修改</Status><span>陈屿</span><span>08-13 14:41</span><button>查看草稿</button></div></div></section> : <section className="import-success admin-section"><CheckCircle size={48} weight="thin" /><h2>导入事务已完成</h2><p>新增 4 个草稿，更新 8 个草稿；50 个未出现产品保持不变。</p><div className="batch-facts"><span><small>批次号</small><b>B-029</b></span><span><small>文件</small><b>torquelis-products-2026-08.xlsx</b></span><span><small>撤销资格</small><Status tone="success">可以整批撤销</Status></span></div><div><Button icon={ArrowLeft} onClick={() => setConflict(true)}>演示撤销冲突</Button><Button kind="secondary" onClick={() => go("/admin/products")}>查看草稿</Button></div></section>}</AdminPage>;
  return <AdminPage route="/admin/import" go={go}><AdminPageHeader eyebrow="产品内容 / 批量导入" title={valid === null ? "上传并校验 Excel" : valid ? "确认草稿差异" : "发现 3 个数据错误"} description="五个工作表使用产品编号作为跨表身份键；任一错误都会阻止整批导入。" action="下载模板" actionIcon={DownloadSimple} /><div className="import-steps">{[[1, "上传工作簿"], [2, "校验预览"], [3, "确认导入"], [4, "草稿结果"]].map(([number, label]) => <div className={(valid === null ? number === 1 : number === 2) ? "active" : number === 1 ? "done" : ""} key={number}><span>{number === 1 && valid !== null ? <Check /> : number}</span><b>{label}</b></div>)}</div>{valid === null ? <section className="upload-stage"><div className="sheet-contract"><p className="admin-eyebrow">工作簿结构</p><h2>需要 5 个命名工作表</h2><div>{["产品", "翻译", "规格值", "参考号", "适配关系"].map((sheet, i) => <span key={sheet}><b>0{i + 1}</b>{sheet}</span>)}</div></div><div className="upload-drop"><FileArrowUp size={48} weight="thin" /><h2>选择 torquelis-products-2026-08.xlsx</h2><p>仅支持基于当前模板的 .xlsx 文件。系统会先收集全部错误，不会立即修改数据。</p><Button icon={FileArrowUp} onClick={() => setValid(false)}>上传并校验</Button></div></section> : <section className="admin-section preview-stage"><div className="preview-summary">{[[valid ? "4" : "4", "新增草稿"], [valid ? "8" : "8", "更新草稿"], [valid ? "0" : "3", "数据错误"], ["12", "受影响产品"]].map(([value, label]) => <div key={label}><strong className={!valid && label === "数据错误" ? "danger-text" : ""}>{value}</strong><span>{label}</span></div>)}<div className="import-eligibility">{valid ? <><CheckCircle weight="fill" /><span><b>可以确认导入</b><small>只更新草稿，不自动发布</small></span></> : <><XCircle weight="fill" /><span><b>禁止确认导入</b><small>修正所有错误后重新上传</small></span></>}</div></div>{valid ? <DiffPreview /> : <ErrorPreview />}<div className="preview-actions"><Button kind="secondary" icon={DownloadSimple}>下载{valid ? "差异报告" : "错误报告"}</Button>{!valid && <Button kind="secondary" icon={Wrench} onClick={() => setValid(true)}>使用已修正工作簿</Button>}<Button icon={Check} disabled={!valid} onClick={() => setImported(true)}>确认导入草稿</Button></div></section>}</AdminPage>;
}

function ErrorPreview() { return <><div className="persistent-banner persistent-banner--danger"><XCircle weight="fill" /><div><b>整批导入已暂停</b><p>下面列出全部数据错误。没有产品被新增、更新或部分写入。</p></div></div><div className="filter-toolbar compact"><button><Table /> 工作表：全部 <CaretDown /></button><button><Tag /> 错误代码：全部 <CaretDown /></button></div><div className="error-table admin-table"><div className="tr th"><span>工作表 / 行</span><span>字段</span><span>错误代码</span><span>问题</span><span>修正建议</span></div>{importErrors.map((error) => <div className="tr" key={error.code}><span><b>{error.sheet}</b><small>第 {error.row} 行</small></span><code>{error.field}</code><code className="error-code">{error.code}</code><span>{error.issue}</span><span>{error.fix}</span></div>)}</div></>; }

function DiffPreview() { return <><div className="persistent-banner persistent-banner--success"><CheckCircle weight="fill" /><div><b>全部校验通过</b><p>未出现在工作簿中的产品保持不变。确认后在一个事务中更新草稿。</p></div></div><div className="diff-list"><article><header><span><b>新增</b> 4 个草稿</span><Status tone="neutral">未公开</Status></header><div><code>TQ-FF-6102</code><span>燃油滤清器 · 中英文完整</span><b>新建草稿</b></div><div><code>TQ-CF-3108</code><span>空调滤清器 · 中英文完整</span><b>新建草稿</b></div></article><article><header><span><b>更新</b> 8 个草稿</span><Status tone="neutral">未公开</Status></header><div><code>TQ-FL-4827</code><span>额定流量</span><del>5.0 L/min</del><ins>5.2 L/min</ins></div><div><code>TQ-AF-2106</code><span>英文名称</span><del>Heavy Duty Air Filter</del><ins>High-Capacity Air Filter</ins></div></article></div></>; }

function ProductsAdmin({ go }) { return <AdminPage route="/admin/products" go={go}><AdminPageHeader eyebrow="产品内容 / 产品" title="产品目录" description="产品编号是语言无关的全站身份。" action="批量导入" actionIcon={FileArrowUp} onAction={() => go("/admin/import")}><Button kind="secondary" icon={DownloadSimple}>导出产品数据</Button></AdminPageHeader><section className="admin-section table-section"><div className="filter-toolbar"><label><MagnifyingGlass /><input placeholder="产品编号或名称" /></label><button>分类：全部 <CaretDown /></button><button>发布状态：全部 <CaretDown /></button><button>语言完整度：全部 <CaretDown /></button></div><div className="admin-table product-admin-table"><div className="tr th"><span>产品编号</span><span>名称</span><span>分类</span><span>语言完整度</span><span>状态</span><span>最近修改</span></div>{[["TQ-FL-4827", "高效燃油滤清器", "燃油滤清器", "中 / EN 完整", "已发布", "王晴 · 14:28"], ["TQ-AF-2106", "高容空气滤清器", "空气滤清器", "中 / EN 完整", "草稿", "陈屿 · 13:46"], ["TQ-OF-1038", "旋装式机油滤清器", "机油滤清器", "中文缺 1 项", "草稿", "王晴 · 昨天"], ["TQ-CF-3021", "活性炭空调滤清器", "空调滤清器", "中 / EN 完整", "已停产", "陈屿 · 08-11"]].map((row) => <button className="tr" key={row[0]} onClick={() => go("/admin/products/TQ-FL-4827")}><code>{row[0]}</code><b>{row[1]}</b><span>{row[2]}</span><span>{row[3]}</span><Status tone={row[4] === "已发布" ? "success" : row[4] === "已停产" ? "warning" : "neutral"}>{row[4]}</Status><span>{row[5]}</span></button>)}</div></section></AdminPage>; }

function ProductEditor({ go }) { const [lang, setLang] = useState("zh"); return <AdminPage route="/admin/products" go={go}><AdminPageHeader eyebrow="产品内容 / TQ-FL-4827" title="高效燃油滤清器" description="草稿 v18 · 公开版本 v17"><Button kind="secondary" icon={ArrowSquareOut} onClick={() => go("/product")}>预览前台</Button><Button icon={Check}>发布产品</Button></AdminPageHeader><div className="editor-layout"><aside className="editor-index">{["基础身份", "中文内容", "英文内容", "分类规格", "参考号", "适配关系", "图片与资料", "SEO", "发布校验"].map((item, index) => <button className={index === 1 ? "active" : ""} key={item}><span>0{index + 1}</span>{item}{index < 1 ? <CheckCircle weight="fill" /> : index === 1 ? <Warning weight="fill" /> : null}</button>)}</aside><section className="admin-section editor-form"><div className="editor-language"><button className={lang === "zh" ? "active" : ""} onClick={() => setLang("zh")}>简体中文 <Status tone="warning">缺 1 项</Status></button><button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>English <Status tone="success">完整</Status></button></div><div className="persistent-banner persistent-banner--warning"><Warning weight="fill" /><div><b>还不能发布</b><p>简体中文短描述为空。产品需要中英文同时通过校验。</p></div></div><label className="cn-field"><span>{lang === "zh" ? "产品名称" : "Product name"}</span><input defaultValue={lang === "zh" ? "高效燃油滤清器" : "High-Efficiency Fuel Filter"} /></label><label className="cn-field"><span>{lang === "zh" ? "短描述" : "Short description"}</span><textarea rows="4" defaultValue={lang === "zh" ? "" : "Standard replacement fuel filter for selected commercial vehicle applications."} placeholder={lang === "zh" ? "发布前需要填写" : ""} /></label><label className="cn-field"><span>{lang === "zh" ? "完整描述" : "Full description"}</span><div className="rich-toolbar"><button><b>H2</b></button><button><b>B</b></button><button><List /></button><button><Globe /></button></div><textarea rows="8" defaultValue={lang === "zh" ? "用于演示结构化规格、适配关系与询盘上下文的商用车燃油滤清器。" : "This fictional product demonstrates structured specifications, fitment and inquiry context."} /></label><footer><span>最后保存：陈屿 · 2026-08-13 13:46</span><Button icon={Check}>保存草稿</Button></footer></section><aside className="publish-check"><p className="admin-eyebrow">发布资格</p><h2>8 / 9 项通过</h2>{["产品编号", "分类与规格", "中文名称", "英文名称", "中文短描述", "英文短描述", "参考号", "适配关系", "图片与替代文本"].map((item) => <div className={item === "中文短描述" ? "missing" : ""} key={item}>{item === "中文短描述" ? <XCircle weight="fill" /> : <CheckCircle weight="fill" />}<span>{item}</span></div>)}</aside></div></AdminPage>; }

function ContentVersions({ go }) { return <AdminPage route="/admin/content" go={go}><AdminPageHeader eyebrow="内容发布 / 发布版本" title="不可变发布历史" description="恢复历史版本只创建新草稿，不直接改变当前公开内容。" /><section className="admin-section versions"><div className="version-current"><span>当前公开版本</span><strong>v17</strong><div><b>王晴</b><small>2026-08-12 16:32 · 中英文同时发布</small></div><Status tone="success">当前</Status></div>{[["v16", "补充 Northline HX9 适配摘要", "陈屿", "2026-08-09 11:08"], ["v15", "更新规格 PDF 与中英文替代文本", "王晴", "2026-08-04 14:20"], ["v14", "首次发布", "陈屿", "2026-07-28 09:41"]].map(([v, summary, actor, time]) => <div className="version-row" key={v}><strong>{v}</strong><span><b>{summary}</b><small>{actor} · {time}</small></span><button>比较版本</button><Button kind="secondary" icon={ArrowLeft}>恢复为新草稿</Button></div>)}</section></AdminPage>; }

function Outbox({ go }) { return <AdminPage route="/admin/outbox" go={go}><AdminPageHeader eyebrow="询盘运营 / 通知发件箱" title="通知捕获记录" description="本地演示只记录集成点，不声称邮件已发送或送达。" /><div className="persistent-banner persistent-banner--neutral"><Info weight="fill" /><div><b>已捕获（本地模拟）</b><p>垃圾询盘不会产生通知记录；这里没有 Sent 或 Delivered 状态。</p></div></div><section className="admin-section table-section"><div className="admin-table"><div className="tr th"><span>捕获时间</span><span>收件角色</span><span>模板</span><span>关联询盘</span><span>状态</span></div><div className="tr"><span>08-13 10:02</span><span>业务人员 · 林婧</span><span>询盘已分配</span><code>TQI-7K4P-92MX</code><Status tone="neutral">已捕获（本地模拟）</Status></div><div className="tr"><span>08-13 09:42</span><span>管理员</span><span>新询盘待分配</span><code>TQI-7K4P-92MX</code><Status tone="neutral">已捕获（本地模拟）</Status></div></div></section></AdminPage>; }

function AuditPage({ go, type = "audit" }) { const settings = type === "settings"; return <AdminPage route={`/admin/${type}`} go={go}><AdminPageHeader eyebrow={settings ? "站点配置" : "系统治理 / 审计日志"} title={settings ? "可编辑配置与环境边界" : "只读操作记录"} description={settings ? "安全配置来自环境变量，后台不展示秘密值。" : "记录操作人、时间、动作、对象和变更摘要；敏感信息不会复制到日志。"} />{settings ? <section className="admin-section settings-grid"><label className="cn-field"><span>企业中文名称</span><input defaultValue="拓擎利滤清" /></label><label className="cn-field"><span>企业英文名称</span><input defaultValue="Torquelis Filters" /></label><label className="cn-field"><span>联系邮箱</span><input defaultValue="inquiry@torquelis.example" /></label><label className="cn-field"><span>模拟通知收件角色</span><select><option>管理员</option></select></label><div className="environment-boundary"><LockKey /><span><b>后台不可修改</b><p>搜索索引模式、数据库地址、会话密钥与演示重置由环境和 CLI 控制。</p></span></div><Button icon={Check}>保存站点配置</Button></section> : <section className="admin-section table-section"><div className="admin-table audit-table"><div className="tr th"><span>时间</span><span>操作人</span><span>动作</span><span>对象</span><span>变更摘要</span></div>{[["14:28", "王晴", "发布产品", "TQ-FL-4827", "草稿 v18 形成公开版本 v17"], ["13:46", "陈屿", "修改草稿", "TQ-AF-2106", "更新英文名称与规格值"], ["11:18", "林婧", "追加首次联系", "TQI-7K4P-92MX", "状态从已分配推进到跟进中"], ["10:02", "陈屿", "分配询盘", "TQI-7K4P-92MX", "负责人从无变更为林婧"]].map((row) => <div className="tr" key={row.join()}>{row.map((cell, i) => i === 3 ? <code key={cell}>{cell}</code> : <span key={cell}>{cell}</span>)}</div>)}</div></section>}</AdminPage>; }

function DesignIndex({ go }) {
  const groups = [
    ["采购主路径", [["英文首页", "/"], ["车型与规格查找结果", "/products"], ["英文产品详情", "/product"], ["产品询盘", "/inquiry"], ["询盘成功", "/success"]]],
    ["询盘运营", [["中文后台总览", "/admin"], ["询盘工作台", "/admin/inquiries"], ["询盘详情与时间线", "/admin/inquiries/TQI-7K4P-92MX"], ["通知发件箱", "/admin/outbox"]]],
    ["内容运营", [["产品列表", "/admin/products"], ["产品双语编辑", "/admin/products/TQ-FL-4827"], ["Excel 上传与校验", "/admin/import"], ["Excel 错误 / 通过预览", "/admin/import/preview"], ["发布版本", "/admin/content"], ["站点配置", "/admin/settings"], ["审计日志", "/admin/audit"]]],
  ];
  return <div className="design-index"><header><Brand go={go} /><div><p className="eyebrow">PRODUCT UI / COMPLETE DESIGN</p><h1>Precision Ledger</h1><p>工业目录 × 技术编辑部。完整设计稿以可点击原型形式组织。</p></div><button onClick={() => go("/")}><X /></button></header><main><section className="foundation-panel"><div><span className="swatch navy" /><code>#10283D</code></div><div><span className="swatch graphite" /><code>#252B2F</code></div><div><span className="swatch warm" /><code>#F7F4EC</code></div><div><span className="swatch orange" /><code>#E56A2E</code></div><div className="type-sample"><strong>Aa 48</strong><span>Barlow Condensed / Inter / Noto Sans SC</span></div><Button>Primary action</Button><Button kind="secondary">Secondary</Button><Status tone="success">已发布</Status><Status tone="warning">待处理</Status></section><section className="screen-groups">{groups.map(([title, items], groupIndex) => <article key={title}><p className="eyebrow">0{groupIndex + 1} / SCREEN SET</p><h2>{title}</h2>{items.map(([label, path], index) => <button key={path} onClick={() => go(path)}><span>{String(index + 1).padStart(2, "0")}</span><b>{label}</b><ArrowRight /></button>)}</article>)}</section><section className="state-matrix"><div><p className="eyebrow">KEY STATES</p><h2>关键边界已进入可交互页面</h2></div><ul><li>精确编号直达、车型规格唯一结果、无结果恢复</li><li>公英制切换、停产替代、结构化询盘与安全回执</li><li>待分配、报价、不可变时间线、重新分配后的权限拒绝</li><li>Excel 全量错误、通过预览、原子导入、可撤销与冲突拒绝</li><li>双语发布资格、历史版本恢复、模拟通知与只读审计</li></ul></section></main></div>;
}

export function App() {
  const [route, go] = useRoute();
  const page = useMemo(() => {
    if (route === "/") return <HomePage go={go} />;
    if (route === "/products") return <ProductFinderPage go={go} />;
    if (route === "/product") return <ProductPage go={go} />;
    if (route === "/inquiry") return <InquiryPage go={go} />;
    if (route === "/success") return <SuccessPage go={go} />;
    if (route === "/design-index") return <DesignIndex go={go} />;
    if (route === "/admin") return <AdminDashboard go={go} />;
    if (route === "/admin/inquiries") return <InquiryWorkbench go={go} />;
    if (route.startsWith("/admin/inquiries/")) return <InquiryDetail go={go} />;
    if (route === "/admin/import" || route === "/admin/import/preview") return <ImportFlow go={go} route={route} />;
    if (route === "/admin/products") return <ProductsAdmin go={go} />;
    if (route.startsWith("/admin/products/")) return <ProductEditor go={go} />;
    if (route === "/admin/content") return <ContentVersions go={go} />;
    if (route === "/admin/outbox") return <Outbox go={go} />;
    if (route === "/admin/settings") return <AuditPage go={go} type="settings" />;
    if (route === "/admin/audit") return <AuditPage go={go} />;
    return <MarketingPage go={go} route={route} />;
  }, [route]);
  return page;
}
