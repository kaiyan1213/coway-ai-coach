-- Import headline pricing from (HC) Homecare Pricelist_V052025.pdf and
-- (HA) 2026 Q3 Home Appliance Pricelist V20260701.pdf into knowledge_base.
-- One entry per product: Rental (WOW5/TradeX-5, 5-year, with care service) monthly
-- price for New Purchase vs Trade-In, plus Outright price for both — this mirrors
-- the existing "never guess new-purchase vs trade-in, always state both" rule.

insert into knowledge_base (category, product, topic, content) values
('价格_Pricelist', 'Villaem 3', 'Villaem 3 价格（2M服务）', '租赁新购(WOW5,5年,含保养) RM104/月；租赁以旧换新(Trade X-5,5年,含保养) RM93/月；买断新购 RM4,200；买断以旧换新 RM3,780。'),
('价格_Pricelist', 'Neon', 'Neon 价格（4M服务）', '租赁新购(WOW5,5年,含保养) RM79/月；租赁以旧换新(Trade X-5,5年,含保养) RM71/月；买断新购 RM3,600；买断以旧换新 RM3,240。'),
('价格_Pricelist', 'Dazzie', 'Dazzie 价格（4M服务）', '租赁新购(WOW5,5年,含保养) RM99/月；租赁以旧换新(Trade X-5,5年,含保养) RM89/月；买断新购 RM4,590；买断以旧换新 RM4,130。'),
('价格_Pricelist', 'Neo Plus', 'Neo Plus 价格（2M服务）', '租赁新购(WOW5,5年,含保养) RM89/月；租赁以旧换新(Trade X-5,5年,含保养) RM80/月；买断新购 RM3,640；买断以旧换新 RM3,270。'),
('价格_Pricelist', 'Ombak', 'Ombak 价格（2M服务）', '租赁新购(WOW5,5年,含保养) RM120/月；租赁以旧换新(Trade X-5,5年,含保养) RM108/月；买断新购 RM4,510；买断以旧换新 RM4,050。'),
('价格_Pricelist', 'Glaze', 'Glaze 价格（2M服务）', '租赁新购(WOW5,5年,含保养) RM105/月；租赁以旧换新(Trade X-5,5年,含保养) RM94/月；买断新购 RM3,900；买断以旧换新 RM3,510。'),
('价格_Pricelist', 'Ais', 'Ais 价格（2M服务）', '租赁新购(WOW5,5年,含保养) RM140/月；租赁以旧换新(Trade X-5,5年,含保养) RM126/月；买断新购 RM7,500；买断以旧换新 RM6,750。'),
('价格_Pricelist', 'Cinnamon', 'Cinnamon 价格（2M服务）', '租赁新购(WOW5,5年,含保养) RM62/月；租赁以旧换新(Trade X-5,5年,含保养) RM55/月；买断新购 RM2,490；买断以旧换新 RM2,240。'),
('价格_Pricelist', 'Core Plus', 'Core Plus 价格（2M服务）', '租赁新购(WOW5,5年,含保养) RM123/月；租赁以旧换新(Trade X-5,5年,含保养) RM110/月；买断新购 RM6,500；买断以旧换新 RM5,850。'),
('价格_Pricelist', 'Lucy Plus', 'Lucy Plus 价格（2M服务）', '租赁新购(WOW5,5年,含保养) RM170/月；租赁以旧换新(Trade X-5,5年,含保养) RM153/月；买断新购 RM8,000；买断以旧换新 RM7,200。'),
('价格_Pricelist', 'Harry', 'Harry 价格（2M服务，旧款）', '租赁新购(WOW5,5年,含保养) RM103/月；租赁以旧换新(Trade X-5,5年,含保养) RM92/月；买断新购 RM3,960；买断以旧换新 RM3,560。'),
('价格_Pricelist', 'Core Slim', 'Core Slim 价格（2M服务）', '租赁新购(WOW5,5年,含保养) RM109/月；租赁以旧换新(Trade X-5,5年,含保养) RM98/月；买断新购 RM5,000；买断以旧换新 RM4,500。'),
('价格_Pricelist', 'Atrium', 'Atrium 价格（2M服务）', '租赁新购(WOW5,5年,含保养) RM119/月；租赁以旧换新(Trade X-5,5年,含保养) RM107/月；买断新购 RM4,800；买断以旧换新 RM4,320。'),
('价格_Pricelist', 'Suite', 'Suite 价格（4M服务）', '租赁新购(WOW5,5年,含保养) RM85/月；租赁以旧换新(Trade X-5,5年,含保养) RM76/月；买断新购 RM3,300；买断以旧换新 RM2,970。'),
('价格_Pricelist', 'Studio', 'Studio 价格（4M服务）', '租赁新购(WOW5,5年,含保养) RM74/月；租赁以旧换新(Trade X-5,5年,含保养) RM66/月；买断新购 RM2,500；买断以旧换新 RM2,250。'),
('价格_Pricelist', 'Lombok 3', 'Lombok 3 价格（标准版,2M服务）', '租赁新购(WOW5,5年,含保养) RM100/月；租赁以旧换新(Trade X-5,5年,含保养) RM90/月；买断新购 RM3,490；买断以旧换新 RM3,140。2025/10/13起有另一款Special Promotion价格更低，请与主管确认是否适用。'),
('价格_Pricelist', 'Storm 2', 'Storm 2 价格（2M服务）', '租赁新购(WOW5,5年,含保养) RM90/月；租赁以旧换新(Trade X-5,5年,含保养) RM81/月；买断新购 RM3,190；买断以旧换新 RM2,870。'),
('价格_Pricelist', 'Noble 2', 'Noble 2 价格（4M服务）', '租赁新购(WOW5,5年,含保养) RM115/月；租赁以旧换新(Trade X-5,5年,含保养) RM103/月；买断新购 RM4,700；买断以旧换新 RM4,230。'),
('价格_Pricelist', 'Flowlet Plus', 'Flowlet Plus 价格（面板款,4M服务）', '租赁新购(WOW5,5年,含保养) RM60/月；租赁以旧换新(Trade X-5,5年,含保养) RM54/月；买断新购 RM2,100；买断以旧换新 RM1,890。遥控款价格略高约RM10。'),
('价格_Pricelist', 'Flowlet', 'Flowlet 电池款价格（4M服务）', '租赁新购(WOW5,5年,含保养) RM50/月；租赁以旧换新(Trade X-5,5年,含保养) RM45/月；买断新购 RM1,600；买断以旧换新 RM1,440。'),
('价格_Pricelist', 'Outdoor Filter', 'Outdoor Filter 价格（6M服务）', '租赁新购(WOW5,5年,含保养) RM80/月；租赁以旧换新(Trade X-5,5年,含保养) RM72/月；买断新购 RM3,500；买断以旧换新 RM3,150。'),
('价格_Pricelist', 'Washer Dryer', 'Washer Dryer(CWD10) 价格（6M服务）', '租赁新购(WOW5,5年,含保养) RM99/月；租赁以旧换新(Trade X-5,5年,含保养) RM89/月；买断新购 RM4,799；买断以旧换新 RM4,320。'),
('价格_Pricelist', 'Front Load Washer 12KG', 'Front Load Washer 12KG 价格（6M服务）', '租赁新购(WOW5,5年,含保养) RM79/月；租赁以旧换新(Trade X-5,5年,含保养) RM71/月；买断新购 RM3,399；买断以旧换新 RM3,050。'),
('价格_Pricelist', 'Washer Dryer 12/9KG', 'Washer Dryer 12/9KG 价格（6M服务）', '租赁新购(WOW5,5年,含保养) RM109/月；租赁以旧换新(Trade X-5,5年,含保养) RM98/月；买断新购 RM5,099；买断以旧换新 RM4,580。'),
('价格_Pricelist', 'Side-By-Side 715L', 'Side-By-Side 715L 价格（6M服务）', '租赁新购(WOW5,5年,含保养) RM104/月；租赁以旧换新(Trade X-5,5年,含保养) RM93/月；买断新购 RM5,899；买断以旧换新 RM5,300。'),
('价格_Pricelist', 'Multi-Door 551L', 'Multi-Door 551L 价格（6M服务）', '租赁新购(WOW5,5年,含保养) RM119/月；租赁以旧换新(Trade X-5,5年,含保养) RM107/月；买断新购 RM6,799；买断以旧换新 RM6,110。'),
('价格_Pricelist', 'Prime 2', 'Prime 2（Prime II）床垫价格 - Queen', '租赁新购(WOW5,5年,含保养) Queen床垫 RM100/月；租赁以旧换新(Trade X-5,5年,含保养) RM90/月；买断新购 RM5,780；买断以旧换新 RM5,200。King尺寸价格更高，请另外确认。'),
('价格_Pricelist', 'Prime Lite', 'Prime Lite 床垫价格 - Queen', '租赁新购(WOW5,5年,含保养) Queen床垫 RM79/月；租赁以旧换新(Trade X-5,5年,含保养) RM71/月；买断新购 RM4,500；买断以旧换新 RM4,050。King尺寸价格更高，请另外确认。'),
('价格_Pricelist', 'Massage Chair', 'Massage Chair(MC-ST01B) 价格', '租赁新购(WOW5,5年,含保养) RM145/月；租赁以旧换新(Trade X-5,5年,含保养) RM130/月；买断新购 RM8,199；买断以旧换新 RM7,370。'),
('价格_Pricelist', 'Mine', 'BEREX Mine 价格', '租赁新购(WOW5,5年,含保养) RM120/月；租赁以旧换新(Trade X-5,5年,含保养) RM108/月；买断新购 RM6,000；买断以旧换新 RM5,400。'),
('价格_Pricelist', 'Pebble', 'BEREX Pebble Chair 价格', '租赁新购(WOW5,5年,含保养) RM145/月；租赁以旧换新(Trade X-5,5年,含保养) RM130/月；买断新购 RM8,000；买断以旧换新 RM7,200。'),
('价格_Pricelist', 'Massage Bed', 'BEREX Massage Bed 价格（标准/高级款）', '标准款(MB-C01)：租赁新购(WOW5,5年,含保养) RM250/月，以旧换新 RM225/月，买断新购 RM14,500，买断以旧换新 RM13,050。高级款(MB-B01)：租赁新购 RM290/月，以旧换新 RM261/月，买断新购 RM16,000，买断以旧换新 RM14,400。'),
('价格_Pricelist', 'P-Series', 'P-Series 冷气机价格', '1.5HP(CAC12-ST02)：租赁新购(WOW5,5年,含保养) RM110/月，以旧换新 RM99/月。2.0HP(CAC18-ST02)：租赁新购 RM129/月，以旧换新 RM116/月。'),
('价格_Pricelist', 'F-Series', 'F-Series 冷气机价格', '1.0HP(CAC09-ST01F)：租赁新购(WOW5,5年,含保养) RM100/月，以旧换新 RM90/月。1.5HP(CAC12-ST01F)：租赁新购 RM110/月，以旧换新 RM99/月。');
