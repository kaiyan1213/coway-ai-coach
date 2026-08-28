-- Import full Coway MY product catalog beyond water purifiers (air purifier, mattress, massage,
-- hands-free bidet, air conditioner, outdoor filter, laundry, refrigerator), plus short knowledge_base
-- entries so the AI coach can answer basic questions about them.

insert into products (name, category, image_url, product_url, sort_order) values
('Studio', '空气清新机', 'https://www.coway.com.my/files/Products/air-purifier/studio/Artboard_1.jpg', 'https://www.coway.com.my/products/air-purifier/studio', 1),
('Suite', '空气清新机', 'https://www.coway.com.my/files/Products/air-purifier/suite/Coway-Suite-Website_KV-mobile.jpg', 'https://www.coway.com.my/products/air-purifier/suite', 2),
('Atrium', '空气清新机', 'https://www.coway.com.my/files/Products/air-purifier/atrium/Artboard_9.png', 'https://www.coway.com.my/products/air-purifier/atrium', 3),
('Noble 2', '空气清新机', 'https://www.coway.com.my/files/Products/air-purifier/noble2/coway-noble2-air-purifier-elevate-your-air-and-space.jpg', 'https://www.coway.com.my/products/air-purifier/noble2', 4),
('Storm 2', '空气清新机', 'https://www.coway.com.my/files/Products/air-purifier/storm2/coway-storm2-air-purifier-with-wider-stronger-quieter.jpg', 'https://www.coway.com.my/products/air-purifier/storm2', 5),
('Lombok 3', '空气清新机', 'https://www.coway.com.my/files/Products/air-purifier/lombok3/coway-lombok3-air-purifier.jpg', 'https://www.coway.com.my/products/air-purifier/lombok3', 6),

('Smart Mattress', '床垫', 'https://www.coway.com.my/files/Products/mattress/smart-mattress/coway-smart-mattress-the-first-mattress-that-adjusts-to-you.jpg', 'https://www.coway.com.my/products/berex/smartmattress', 1),
('Prime Lite', '床垫', 'https://www.coway.com.my/files/Products/mattress/primelite/wake-up-effortlessly-with-coway-prime-lite.jpg', 'https://www.coway.com.my/products/berex/primelite', 2),
('Eco Lite', '床垫', 'https://www.coway.com.my/files/Products/mattress/ecolite/coway-eco-lite-mattress-now-comfortably-priced.jpg', 'https://www.coway.com.my/products/berex/ecolite', 3),
('Prime 2', '床垫', 'https://www.coway.com.my/files/Products/mattress/prime2/coway-malaysia-prime2-series-premium-mattress-with-rental-cleaning-service.jpg', 'https://www.coway.com.my/products/berex/prime2', 4),

('Senno Plus', '按摩椅', 'https://www.coway.com.my/files/Products/massage-chair/senno-plus/Desktop/headbanner.jpg', 'https://www.coway.com.my/products/berex/sennoplus', 1),
('Senno', '按摩椅', 'https://www.coway.com.my/files/Products/massage-chair/senno/Desktop/headbanner.jpg', 'https://www.coway.com.my/products/berex/senno', 2),
('Massage Bed', '按摩椅', 'https://www.coway.com.my/files/Products/berex/massage-bed/coway-berex-massage-bed.jpg', 'https://www.coway.com.my/products/berex/massagebed', 3),
('Pebble', '按摩椅', 'https://www.coway.com.my/files/Products/berex/pebble/coway-berex-pebble-massage-chair.jpg', 'https://www.coway.com.my/products/berex/pebble', 4),
('Mine', '按摩椅', 'https://www.coway.com.my/files/Products/berex/mine/coway-berex-mine-compact-massage-chair.jpg', 'https://www.coway.com.my/products/berex/mine', 5),
('Massage Chair', '按摩椅', 'https://www.coway.com.my/files/Products/massage-chair/massage-chair/coway-massage-chair-a-new-level-of-soothing-silence.jpg', 'https://www.coway.com.my/products/berex/massagechair', 6),

('Flowlet Plus', '免治马桶', 'https://www.coway.com.my/files/Products/bathroom/flowlet-plus/coway-flowlet-plus-electronic-bidet.jpg', 'https://www.coway.com.my/products/handsfree-bidet/flowletplus', 1),
('Flowlet', '免治马桶', 'https://www.coway.com.my/files/Products/bathroom/flowlet/coway-flowlet-battery-bidet.jpg', 'https://www.coway.com.my/products/handsfree-bidet/flowlet', 2),

('P-Series', '空调', 'https://www.coway.com.my/files/Products/cooling/pseries/coway-p-series-air-conditioner-big-power-small-price2.jpg', 'https://www.coway.com.my/products/airconditioner/pseries', 1),
('F-Series', '空调', 'https://www.coway.com.my/files/Products/cooling/air-conditioner/coway-air-conditioner-cool-comfort-meets-pure-protection.jpg', 'https://www.coway.com.my/products/airconditioner/fseries', 2),

('Outdoor Filter', '户外净水器', 'https://www.coway.com.my/files/Products/outdoor/outdoor-filter/coway-outdoor-filter-home-holistic-water-solution.jpg', 'https://www.coway.com.my/products/outdoor/outdoorfilter', 1),

('Washer Dryer 12/9KG', '洗衣机', 'https://www.coway.com.my/files/Products/laundry/washer-dryer-12kg/mobile/mobile-new-banner.png', 'https://www.coway.com.my/products/laundry/washer-dryer-12-9kg', 1),
('Front Load Washer 12KG', '洗衣机', 'https://www.coway.com.my/files/Products/laundry/frontload-washer/washer_blue_banner.jpg', 'https://www.coway.com.my/products/laundry/front-load-washer-12kg', 2),
('Washer Dryer', '洗衣机', 'https://www.coway.com.my/files/Products/laundry/washer-dryer/coway-washer-dryer-CWD10-ST01.jpg', 'https://www.coway.com.my/products/laundry/washerdryer', 3),

('Multi-Door 551L', '冰箱', 'https://www.coway.com.my/files/Products/refrigerator/551L/fridge_551L_homebanner_fridge_mobile.png', 'https://www.coway.com.my/products/refrigerator/multidoor551l', 1),
('Side-By-Side 715L', '冰箱', 'https://www.coway.com.my/files/Products/refrigerator/715L/double_inverter_1.png', 'https://www.coway.com.my/products/refrigerator/sidebyside715l', 2);

insert into knowledge_base (category, product, topic, content) values
('下单前_产品', 'Studio', 'Studio 空气清新机简介', 'Coway Studio 智能360°净化，低噪音运行，动态气流，适用于最大76平方米房间。'),
('下单前_产品', 'Suite', 'Suite 空气清新机简介', 'Coway Suite 三重防护过滤，实时空气质量显示，自适应模式，适合大卧室和共享空间。'),
('下单前_产品', 'Atrium', 'Atrium 空气清新机简介', 'Coway Atrium 双面三重过滤，360°气流，适合大户型住宅及商用办公空间。'),
('下单前_产品', 'Noble 2', 'Noble 2 空气清新机简介', 'Coway Noble 2 配备UVC杀菌、强力除尘过滤，带滚轮设计方便移动。'),
('下单前_产品', 'Storm 2', 'Storm 2 空气清新机简介', 'HEPA滤网空气清新机，去除灰尘、雾霾、细菌和宠物异味。'),
('下单前_产品', 'Lombok 3', 'Lombok 3 空气清新机简介', 'RBD等离子技术+负离子发生器+双重HEPA滤网，适合除尘除味及宠物家庭。'),
('下单前_产品', 'Smart Mattress', 'Smart Mattress 床垫简介', 'Coway Berex Smart Mattress，高级睡眠支撑床垫，长效舒适。'),
('下单前_产品', 'Prime Lite', 'Prime Lite 床垫简介', '冰凉中等硬度泡棉床垫，抗静脊椎支撑，适合极简卧室与护脊需求。'),
('下单前_产品', 'Eco Lite', 'Eco Lite 床垫简介', '实心床垫，专为马来西亚炎热气候设计的冰凉触感，支撑背部与脊椎。'),
('下单前_产品', 'Prime 2', 'Prime 2 床垫简介', '椰纤+天然乳胶+7区独立弹簧，冰凉贴合支撑，适合轻体重睡眠者。'),
('下单前_产品', 'Senno Plus', 'Senno Plus 按摩椅简介', 'BEREX Senno Plus 4D智能按摩椅，Fatigue Bio Scan疲劳扫描、44气囊、语音操控。'),
('下单前_产品', 'Senno', 'Senno 按摩椅简介', 'BEREX Senno 智能恢复按摩椅，Fatigue Bio Scan疲劳扫描、4D按摩、语音操控。'),
('下单前_产品', 'Massage Bed', 'Massage Bed 简介', '可折叠全身加热按摩床，兼顾便利与豪华享受。'),
('下单前_产品', 'Pebble', 'Pebble 按摩椅简介', '人体工学按摩椅，3D指压+热疗，促进舒适放松。'),
('下单前_产品', 'Mine', 'Mine 按摩椅简介', '小巧轻便的足部按摩椅，带滚轮方便移动，适合空间有限场所。'),
('下单前_产品', 'Massage Chair', 'Massage Chair 简介', 'Coway全身按摩椅，脚部/小腿/背部按摩，居家深度放松。'),
('下单前_产品', 'Flowlet Plus', 'Flowlet Plus 免治马桶简介', '智能电子免治马桶盖，自清洁自杀菌系统，加热座圈。'),
('下单前_产品', 'Flowlet', 'Flowlet 免治马桶简介', '电池式免治马桶盖，无需接电，方便安装。'),
('下单前_产品', 'P-Series', 'P-Series 空调简介', '1.5HP及2.0HP冷气机，5星节能认证，自动清洗功能。'),
('下单前_产品', 'F-Series', 'F-Series 空调简介', '1HP及1.5HP变频冷气机，5星节能认证，自动清洗功能。'),
('下单前_产品', 'Outdoor Filter', 'Outdoor Filter 户外净水器简介', '户外净水器，PVDF超滤膜，可靠过滤，安装简便，适合全屋用水前置过滤。'),
('下单前_产品', 'Washer Dryer 12/9KG', 'Washer Dryer 12/9KG 简介', '12kg洗衣/9kg烘干2合1洗衣机，型号CWD12-ST01。'),
('下单前_产品', 'Front Load Washer 12KG', 'Front Load Washer 12KG 简介', '12kg滚筒洗衣机。'),
('下单前_产品', 'Washer Dryer', 'Washer Dryer 简介', '10kg 2合1洗衣烘干机，型号CWD10-ST01。'),
('下单前_产品', 'Multi-Door 551L', 'Multi-Door 551L 冰箱简介', '多门冰箱551L，多温区、可变换储存空间，适合大家庭。'),
('下单前_产品', 'Side-By-Side 715L', 'Side-By-Side 715L 冰箱简介', '对开门冰箱715L，大容量、湿度控制、智能收纳，适合大家庭。');
