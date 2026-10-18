"""Reproducible report diagrams. No network calls or production data."""
from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent / 'figures'
BLUE = '#103A68'
INK = '#233246'
LINE = '#698097'
PALE = '#EDF3F8'
WHITE = '#FFFFFF'
WIDTH = 1200


def font(size=29, bold=False):
    return ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf', size)


def lines(draw, text, width, f):
    out = []
    for paragraph in text.split('\n'):
        row = ''
        for word in paragraph.split():
            candidate = (row + ' ' + word).strip()
            if row and draw.textlength(candidate, font=f) > width:
                out.append(row)
                row = word
            else:
                row = candidate
        out.append(row)
    return out


def text(draw, value, rect, size=29, bold=False, color=INK, align='center'):
    x1, y1, x2, y2 = rect
    f = font(size, bold)
    rows = lines(draw, value, x2-x1, f)
    height = size + 10
    if len(rows)*height > y2-y1:
        raise ValueError(f'Text overflow: {value!r} in {rect}')
    y = y1 + (y2-y1-len(rows)*height)/2
    for row in rows:
        x = x1 if align == 'left' else (x1+x2-draw.textlength(row, font=f))/2
        draw.text((x, y), row, fill=color, font=f)
        y += height


def canvas(title, height):
    image = Image.new('RGB', (WIDTH, height), WHITE)
    draw = ImageDraw.Draw(image)
    text(draw, title, (35, 12, 1165, 105), 36, True, BLUE)
    return image, draw


def node(draw, rect, title, body='', fill=PALE):
    x1, y1, x2, y2 = rect
    draw.rounded_rectangle(rect, radius=14, fill=fill, outline=LINE, width=2)
    if body:
        text(draw, title, (x1+18, y1+10, x2-18, y1+57), 30, True, BLUE)
        text(draw, body, (x1+20, y1+62, x2-20, y2-12), 25)
    else:
        text(draw, title, (x1+20, y1+8, x2-20, y2-8), 29, True, BLUE)


def arrow(draw, points, color=LINE, dashed=False):
    if dashed:
        for a,b in zip(points, points[1:]):
            length=math.dist(a,b)
            for t in range(0, int(length), 16):
                p=(a[0]+(b[0]-a[0])*t/length, a[1]+(b[1]-a[1])*t/length)
                q=(a[0]+(b[0]-a[0])*min(t+8,length)/length, a[1]+(b[1]-a[1])*min(t+8,length)/length)
                draw.line([p,q], fill=color, width=3)
    else:
        draw.line(points, fill=color, width=3)
    a,b=points[-2:]
    angle=math.atan2(b[1]-a[1], b[0]-a[0])
    draw.polygon([b,(b[0]-16*math.cos(angle-.45),b[1]-16*math.sin(angle-.45)),(b[0]-16*math.cos(angle+.45),b[1]-16*math.sin(angle+.45))], fill=color)


def save(image, name):
    ROOT.mkdir(exist_ok=True)
    image.save(ROOT / name, dpi=(220,220))


def architecture():
    im,d=canvas('Kiến trúc hệ thống SLNA Ticketing', 1350)
    node(d,(70,120,1130,245),'Trình duyệt web và điện thoại','Khán giả · Quản trị viên · Nhân viên soát vé')
    arrow(d,[(600,245),(600,310)])
    node(d,(70,310,1130,460),'Frontend Next.js trên Vercel','Giao diện mua vé, quản trị và camera QR\nHTTPS · API kèm cookie HttpOnly')
    arrow(d,[(600,460),(600,525)])
    node(d,(70,525,1130,705),'Backend Express trên máy chủ Ubuntu','REST API · Phân quyền · Giữ ghế và đơn hàng\nWebhook HMAC · QR vé · SMTP · Gemini · Nhật ký')
    for x in (300,900):
        arrow(d,[(600,705),(600,740),(x,740),(x,775)])
    node(d,(70,775,555,970),'PostgreSQL','Tài khoản, trận, đơn, vé\nGiao dịch SePay, token reset\nTri thức, cấu hình, nhật ký')
    node(d,(645,775,1130,970),'Thư mục uploads','Logo đội khách và tài trợ\nBanner, ảnh trận\nTách nền sáng ở mép logo')
    node(d,(70,1040,1130,1250),'Dịch vụ bên ngoài kết nối với backend','SePay xác nhận tiền · VietQR tạo QR chuyển khoản\nGoogle/Meta OAuth · SMTP gửi link đặt lại mật khẩu\nGemini hội thoại · SLNAFC/VPF cung cấp nội dung')
    text(d,'Dữ liệu tiền, ghế, quyền và QR được kiểm tra tại API và PostgreSQL.',(65,1240,1135,1320),27)
    save(im,'architecture.png')


def actor(d,x,y,label):
    d.ellipse((x-17,y-47,x+17,y-13),outline=BLUE,width=3)
    d.line([(x,y-13),(x,y+35)],fill=BLUE,width=3)
    d.line([(x-28,y+4),(x+28,y+4)],fill=BLUE,width=3)
    d.line([(x,y+35),(x-24,y+64)],fill=BLUE,width=3)
    d.line([(x,y+35),(x+24,y+64)],fill=BLUE,width=3)
    text(d,label,(15,y+73,225,y+172),26,True,BLUE)


def usecase():
    im,d=canvas('Use case chính theo tác nhân',1430)
    d.rectangle((260,115,1165,1285),fill='#FAFCFF',outline=LINE,width=2)
    text(d,'SLNA Ticketing',(285,120,1140,170),30,True,BLUE)
    groups=[
        (260,'Khán giả',['Tài khoản LOCAL/OAuth\nQuên mật khẩu','CCCD, giữ ghế\nThanh toán, xem QR','Lịch đấu, tin tức\nChatbot Gemini']),
        (485,'ADMIN',['Trận, kho vé\nVé giấy','Đơn, đối soát\nCCCD, báo cáo','Banner, tài trợ\nNhật ký']),
        (710,'SCANNER',['Chọn trận\nQuét QR điện thoại','Nhận kết quả\nHợp lệ hoặc từ chối']),
        (935,'Quản trị viên gốc',['Cấp/thu hồi ADMIN','Cấp/thu hồi SCANNER']),
        (1160,'SePay',['Gửi webhook\nXác nhận giao dịch','Đối soát\nPhát hành QR'])]
    for y,label,cases in groups:
        actor(d,115,y-25,label)
        d.line([(145,y),(245,y),(245,y-65),(417+(len(cases)-1)*292,y-65)],fill=LINE,width=2)
        for idx,value in enumerate(cases):
            x=280+idx*292
            rect=(x,y-45,x+275,y+85)
            d.line([(x+137,y-65),(x+137,y-45)],fill=LINE,width=2)
            d.ellipse(rect,fill=WHITE,outline=BLUE,width=2)
            text(d,value,(x+15,y-34,x+260,y+74),25)
    text(d,'Quản trị viên gốc là ADMIN có email khớp SUPER_ADMIN_EMAIL.\nSCANNER chỉ có quyền nghiệp vụ soát vé; các quyền được kiểm tra tại API.',(50,1300,1150,1415),26)
    save(im,'usecase.png')


def entity(d,rect,title,fields):
    x1,y1,x2,y2=rect
    d.rectangle(rect,fill=WHITE,outline=LINE,width=2)
    d.rectangle((x1,y1,x2,y1+57),fill=PALE,outline=LINE,width=2)
    text(d,title,(x1+14,y1+5,x2-14,y1+53),29,True,BLUE)
    text(d,'\n'.join(fields),(x1+18,y1+72,x2-18,y2-12),26,align='left')


def erd():
    im,d=canvas('ERD lõi bán vé và quan hệ một nhiều',1210)
    entity(d,(40,140,530,515),'users',['PK id; email UNIQUE','password; token_version','role; status; cccd','auth_provider; provider_id'])
    entity(d,(670,140,1160,515),'matches',['PK id; opponent','match_date; stadium','stand_prices; free_stands','status; home_score; away_score'])
    entity(d,(40,680,530,1060),'orders',['PK id; FK user_id','status; total_amount','payment_method; expires_at','order_qr_code UNIQUE','transaction_id; payment_qr_code'])
    entity(d,(670,680,1160,1060),'tickets',['PK id; FK match_id, order_id','FK held_by, printed_by → users','seat_code; price; status','ticket_qr_code UNIQUE','held_until; is_scanned; is_printed'])
    arrow(d,[(285,515),(285,680)])
    text(d,'1 : N',(300,550,500,635),27)
    arrow(d,[(915,515),(915,680)])
    text(d,'1 : N',(935,550,1125,635),27)
    arrow(d,[(530,860),(670,860)])
    text(d,'1 : N',(540,790,660,845),26)
    text(d,'Ghế thuộc một trận; UNIQUE(match_id, seat_code).\nMột đơn có nhiều vé; SOLD chưa đủ chứng minh đã thanh toán.',(40,1090,1160,1200),27)
    save(im,'erd.png')
    im,d=canvas('ERD các bảng tích hợp và hỗ trợ',1570)
    data=[
      ((40,130,575,515),'sepay_transactions',['PK transaction_id','FK order_id → orders.id','payment_code; account_number','amount; status; payload','received_at']),
      ((625,130,1160,515),'password_reset_tokens',['PK id; FK user_id → users.id','token_hash UNIQUE','expires_at; used_at','created_at']),
      ((40,575,575,955),'knowledge_sources',['PK source_key','publisher; base_url; is_enabled','last_synced_at','last_sync_status; last_sync_error']),
      ((625,575,1160,955),'knowledge_documents',['PK id; FK source_key','url UNIQUE; title; summary','content; content_hash','published_at; fetched_at','image_url; category']),
      ((40,1015,575,1395),'sponsors',['PK id; name; level','logo_url; website_url','sort_order; is_active','created_at; updated_at']),
      ((625,1015,1160,1210),'site_settings',['PK key; value; updated_at']),
      ((625,1250,1160,1485),'audit_logs',['PK id; user_id (liên kết logic)','action; entity_type; entity_id','metadata; created_at'])]
    for rect,title,fields in data:entity(d,rect,title,fields)
    arrow(d,[(575,760),(625,760)])
    text(d,'knowledge_sources 1 : N knowledge_documents; PK = khóa chính, FK = khóa ngoại.',(40,1500,1160,1560),25)
    save(im,'erd_support.png')


def flow(name,title,steps,note):
    height=150+len(steps)*205+150
    im,d=canvas(title,height)
    for i,(heading,body) in enumerate(steps):
        y=125+i*205
        node(d,(95,y,1105,y+155),heading,body)
        if i<len(steps)-1:arrow(d,[(600,y+155),(600,y+205)])
    text(d,note,(70,height-140,1130,height-15),27)
    save(im,name)


def detailed_usecase(name, title, actor_name, cases, note):
    """Draw a focused use-case diagram with one primary actor and up to six cases."""
    im,d=canvas(title,1120)
    d.rounded_rectangle((260,120,1155,900),radius=18,fill='#FAFCFF',outline=LINE,width=2)
    text(d,'Biên hệ thống SLNA Ticketing',(290,125,1125,180),29,True,BLUE)
    actor(d,125,430,actor_name)
    d.line([(155,430),(235,430)],fill=LINE,width=3)
    d.line([(235,245),(235,760)],fill=LINE,width=3)
    positions=[]
    for idx,value in enumerate(cases[:6]):
        col=idx%2
        row=idx//2
        x=310+col*420
        y=220+row*220
        rect=(x,y,x+355,y+145)
        if col == 0:
            d.line([(235,y+72),(x,y+72)],fill=LINE,width=2)
        else:
            d.line([(235,y-25),(x-30,y-25),(x-30,y+72),(x,y+72)],fill=LINE,width=2)
        d.ellipse(rect,fill=WHITE,outline=BLUE,width=2)
        text(d,value,(x+18,y+8,x+337,y+137),22)
        positions.append(rect)
    text(d,note,(55,925,1145,1095),27)
    save(im,name)


def sequence(name, title, participants, messages, note):
    """Draw a compact sequence diagram. Message tuples: (from, to, label, dashed)."""
    height=300+len(messages)*105+170
    im,d=canvas(title,height)
    centers=[]
    gap=920/max(1,len(participants)-1) if len(participants)>1 else 0
    for idx,label in enumerate(participants):
        x=140+idx*gap
        centers.append(x)
        d.rounded_rectangle((x-115,125,x+115,215),radius=14,fill=PALE,outline=LINE,width=2)
        text(d,label,(x-103,133,x+103,207),23,True,BLUE)
        d.line([(x,215),(x,height-155)],fill='#AAB8C5',width=2)
    for idx,(source,target,label,dashed) in enumerate(messages):
        y=330+idx*105
        x1=centers[source]
        x2=centers[target]
        arrow(d,[(x1,y),(x2,y)],dashed=dashed)
        left=min(x1,x2)+12
        right=max(x1,x2)-12
        text(d,label,(left,y-84,right,y-5),20,False,INK)
    text(d,note,(55,height-145,1145,height-15),26)
    save(im,name)


def order_state():
    im,d=canvas('Biểu đồ trạng thái đơn hàng online',920)
    d.ellipse((570,115,630,175),fill=BLUE)
    arrow(d,[(600,175),(600,235)])
    node(d,(420,235,780,365),'PENDING','Chờ SePay; có expires_at.')
    arrow(d,[(510,365),(510,455),(290,455),(290,515)])
    text(d,'Webhook khớp mã, tiền, tài khoản và còn hạn',(65,385,470,465),22)
    arrow(d,[(690,365),(690,455),(910,455),(910,515)])
    text(d,'Hết hạn hoặc admin hủy hợp lệ',(730,385,1125,465),22)
    node(d,(105,515,475,660),'SUCCESS','Sinh QR vé; trạng thái kết thúc.',fill='#E8F7EE')
    node(d,(725,515,1095,660),'CANCELLED','Hoàn ghế AVAILABLE; kết thúc.',fill='#FDEEEE')
    d.ellipse((255,710,325,780),outline=BLUE,width=5)
    d.ellipse((270,725,310,765),fill=BLUE)
    d.ellipse((875,710,945,780),outline=BLUE,width=5)
    d.ellipse((890,725,930,765),fill=BLUE)
    arrow(d,[(290,660),(290,710)])
    arrow(d,[(910,660),(910,710)])
    text(d,'Không có đường chuyển trực tiếp từ CANCELLED sang SUCCESS; giao dịch lệch được lưu REVIEW.',(55,800,1145,900),27)
    save(im,'order_state.png')


def ticket_state():
    im,d=canvas('Biểu đồ trạng thái vé và ghế',1180)
    node(d,(420,125,780,245),'AVAILABLE','Có thể chọn.')
    arrow(d,[(500,245),(500,330),(285,330),(285,390)])
    text(d,'Người dùng giữ 10 phút',(55,275,400,330),23)
    arrow(d,[(700,245),(700,330),(915,330),(915,390)])
    text(d,'Admin dành cho kênh giấy',(790,275,1145,330),23)
    node(d,(90,390,480,535),'HELD','Có người giữ và thời hạn.')
    node(d,(720,390,1110,535),'PAPER_RESERVED','Dành cho vé giấy.')
    arrow(d,[(285,535),(285,655)])
    text(d,'Checkout tạo đơn PENDING',(55,570,515,630),23)
    arrow(d,[(915,535),(915,655)])
    text(d,'Ghi nhận đã bán',(735,570,1095,630),23)
    node(d,(90,655,480,805),'SOLD','Online: cần order SUCCESS.')
    node(d,(720,655,1110,805),'PAPER_SOLD','Vé giấy đã bán.')
    arrow(d,[(90,465),(45,465),(45,185),(420,185)],dashed=True)
    text(d,'Hết giữ / trả ghế',(55,200,370,260),22)
    arrow(d,[(720,465),(650,465),(650,270),(780,270),(780,245)],dashed=True)
    text(d,'Chỉ hoàn khi chưa in',(480,360,640,440),21)
    arrow(d,[(285,805),(285,900)])
    arrow(d,[(915,805),(915,900)])
    node(d,(90,900,480,1025),'ĐÃ SOÁT','is_scanned = true.',fill='#E8F7EE')
    node(d,(720,900,1110,1025),'ĐÃ SOÁT','is_scanned = true.',fill='#E8F7EE')
    text(d,'QR online chỉ được tạo sau SUCCESS; trạng thái SOLD một mình chưa chứng minh đã thanh toán.',(55,1060,1145,1160),26)
    save(im,'ticket_state.png')


def make_figures():
    architecture()
    usecase()
    detailed_usecase('usecase_user.png','Use case chi tiết của khán giả','Khán giả',[
      'Đăng ký LOCAL hoặc OAuth\nĐăng nhập và quên mật khẩu',
      'Cập nhật hồ sơ\nGửi CCCD để xác minh',
      'Xem trận, giá và ghế\nGiữ hoặc trả ghế',
      'Checkout và quét VietQR\nTheo dõi trạng thái đơn',
      'Xem Vé của tôi\nSử dụng QR vào sân',
      'Hỏi chatbot\nXem tin và nhà tài trợ'],
      'Use case mua vé bao gồm xác thực, CCCD VERIFIED, giữ ghế, tạo đơn và chờ SePay.\nNgười dùng không thể tự xác nhận thanh toán hoặc tự sinh QR vé.')
    detailed_usecase('usecase_admin.png','Use case chi tiết của khối vận hành','ADMIN / SCANNER',[
      'Quản lý trận đấu\nCấu hình giá và sinh kho vé',
      'Quản lý đơn\nĐối soát giao dịch SePay',
      'Phát hành vé giấy\nIn, bán và kiểm soát phôi',
      'Duyệt CCCD và khóa user\nCấp quyền nếu là root admin',
      'Quản lý banner, sponsor\nNguồn tri thức và ảnh',
      'Chọn trận và quét QR\nXem báo cáo, nhật ký'],
      'SCANNER chỉ được soát vé; ADMIN vận hành dữ liệu.\nChỉ quản trị viên gốc được cấp hoặc thu hồi vai trò ADMIN/SCANNER.')
    erd()
    flow('hold_flow.png','Luồng đặt vé online và thanh toán SePay',[
      ('1. Xác minh và chọn ghế','Đăng nhập, CCCD VERIFIED, trận ON_SALE; hạn mức 4 vé/trận.'),
      ('2. Giữ ghế','AVAILABLE → HELD; held_until tính 10 phút từ phía máy chủ.'),
      ('3. Tạo đơn','Đơn PENDING có hạn mới 15 phút; ghế SOLD, ticket_qr_code = NULL.'),
      ('4. Chuyển khoản bằng VietQR','Đúng tài khoản, số tiền và mã SLNA + 12 ký tự hex; chờ webhook.'),
      ('5. Xác nhận và phát hành vé','HMAC, timestamp, mã đơn, số tiền và hạn hợp lệ → SUCCESS, sinh QR.')],
      'Đơn quá hạn → CANCELLED, hoàn ghế AVAILABLE.\nGiao dịch không khớp → lưu REVIEW để đối soát, không phát hành vé.')
    order_state()
    ticket_state()
    flow('paper_flow.png','Luồng phát hành và soát vé giấy',[
      ('1. Dành vé giấy','ADMIN chọn trận, khán đài và số lượng; AVAILABLE → PAPER_RESERVED.'),
      ('2. In vé PDF','Vé giấy có mã QR; ghi is_printed, printed_at và printed_by.'),
      ('3. Ghi nhận bán','ADMIN chuyển PAPER_RESERVED → PAPER_SOLD.'),
      ('4. Soát tại cổng','ADMIN/SCANNER chọn đúng trận, quét QR, kiểm tra chưa dùng.')],
      'Vé giấy đã in không được trả về kho online.\nPAPER_RESERVED chưa đủ điều kiện vào sân.')
    flow('scan_flow.png','Luồng soát QR bằng điện thoại',[
      ('1. Nhân viên chọn trận','Vai trò ADMIN hoặc SCANNER; sử dụng trang /admin/scanner qua HTTPS.'),
      ('2. Bật camera sau','Cho phép camera; hỗ trợ đèn pin và giữ màn hình sáng tùy thiết bị.'),
      ('3. Đọc QR và gửi API','Gửi ticketQrCode + matchId; tạm khóa đọc trùng trong giao diện.'),
      ('4. Kiểm tra trong transaction','Khóa vé, đối chiếu trận, trạng thái vé/đơn và is_scanned = false.'),
      ('5. Hiển thị kết quả','Hợp lệ: đánh dấu is_scanned. Phản hồi lớn, âm/rung; tiếp tục quét.')],
      'Sai trận, chưa thanh toán, QR lạ hoặc đã dùng → từ chối.\nLỗi mạng không được coi là soát vé thành công.')
    sequence('scan_sequence.png','Biểu đồ tuần tự quét vé tại cổng',
      ['Nhân viên','Web di động','API','PostgreSQL'],[
      (0,1,'Chọn trận, bật camera và quét QR',False),
      (1,2,'POST ticketQrCode + matchId (cookie phiên)',False),
      (2,3,'BEGIN; khóa bản ghi vé',False),
      (3,2,'Vé, trận, đơn, is_scanned',True),
      (2,3,'Cập nhật is_scanned + audit nếu hợp lệ',False),
      (3,2,'COMMIT',True),
      (2,1,'Kết quả và lý do cụ thể',True),
      (1,0,'Màu lớn, âm thanh/rung; mở lượt tiếp',True)],
      'Khóa transaction ngăn hai cổng cùng chấp nhận một QR.\nTimeout hoặc lỗi mạng không được hiển thị như một lượt quét thành công.')
    flow('sepay_flow.png','Xử lý webhook SePay tại backend',[
      ('1. Xác minh yêu cầu','Kiểm tra HMAC-SHA256 trên timestamp + raw body; lệch giờ tối đa 300 giây.'),
      ('2. Kiểm tra giao dịch','Gửi thử id = 0: trả thành công, không ghi DB. Giao dịch thật: ID và tiền > 0.'),
      ('3. Chống xử lý lặp','BEGIN; INSERT transaction_id duy nhất. Trùng ID → COMMIT và kết thúc.'),
      ('4. Đối chiếu đơn đã khóa','Tiền vào, tài khoản đúng; mã ^SLNA[A-F0-9]{12}$; PENDING, còn hạn, đúng tiền.'),
      ('5. Lưu kết quả nguyên tử','Khớp: SUCCESS + QR + audit + MATCHED; lệch: REVIEW_*; COMMIT.')],
      'Lỗi xử lý → ROLLBACK và HTTP 500 để phía gửi có thể thử lại.\nHTTP 200 chỉ xác nhận đã nhận/xử lý webhook; chưa đủ kết luận đơn đã trả tiền.')
    flow('auth_flow.png','Activity đăng nhập LOCAL an toàn',[
      ('1. Nhận email và mật khẩu','Chuẩn hóa email, giới hạn độ dài và áp dụng rate limit.'),
      ('2. Tìm tài khoản LOCAL','Không tiết lộ email có tồn tại hay provider khác.'),
      ('3. Xác minh bcrypt và trạng thái','Mật khẩu đúng, user ACTIVE và dữ liệu tài khoản hợp lệ.'),
      ('4. Tạo phiên','Ký JWT chứa user id + token_version; đặt cookie HttpOnly/Secure.'),
      ('5. Kiểm tra ở mỗi request','Middleware tra lại user, role, status và token_version.')],
      'Thông báo lỗi đăng nhập được chuẩn hóa; token không lưu trong localStorage.\nĐổi email/mật khẩu tăng token_version để vô hiệu hóa phiên cũ.')
    flow('password_reset_flow.png','Activity quên và đặt lại mật khẩu',[
      ('1. Yêu cầu đặt lại','Luôn trả thông báo chung để không lộ email có tồn tại.'),
      ('2. Kiểm tra điều kiện nội bộ','Chỉ tài khoản LOCAL, ACTIVE và chưa vượt rate limit.'),
      ('3. Phát hành token một lần','Sinh 32 byte ngẫu nhiên; chỉ lưu SHA-256; hết hạn sau 15 phút.'),
      ('4. Gửi liên kết qua SMTP','Email chứa token thô trong URL frontend; không ghi token vào log.'),
      ('5. Đặt mật khẩu mới','Hash token, khóa bản ghi, kiểm tra hạn/used_at, băm mật khẩu.'),
      ('6. Thu hồi phiên','Đánh dấu token đã dùng, tăng token_version và yêu cầu đăng nhập lại.')],
      'Token hết hạn hoặc đã dùng không thể tái sử dụng.\nTài khoản Google/Facebook dùng quy trình khôi phục của nhà cung cấp.')
    sequence('oauth_flow.png','Biểu đồ tuần tự đăng nhập Google/Facebook',
      ['Người dùng','Frontend','Backend','Nhà cung cấp'],[
      (0,1,'Chọn Đăng nhập bằng Google/Facebook',False),
      (1,2,'GET /api/auth/oauth/{provider}',False),
      (2,3,'Redirect kèm state và callback cố định',False),
      (3,0,'Màn hình đồng ý của nhà cung cấp',True),
      (0,3,'Đăng nhập và đồng ý phạm vi tối thiểu',False),
      (3,2,'Callback code + state',False),
      (2,3,'Đổi code và lấy profile server-to-server',False),
      (3,2,'provider_id, email, tên',True),
      (2,1,'Set cookie; chuyển complete-profile hoặc trang chủ',True)],
      'State được ràng buộc với trình duyệt và callback phải khớp tuyệt đối.\nClient secret chỉ tồn tại ở backend, không nhúng vào frontend.')
    flow('role_flow.png','Activity cấp quyền quản trị và soát vé',[
      ('1. Xác thực người thao tác','Phiên hợp lệ, user ACTIVE và role ADMIN.'),
      ('2. Xác định quản trị viên gốc','Email chuẩn hóa phải khớp SUPER_ADMIN_EMAIL.'),
      ('3. Kiểm tra tài khoản đích','Không tự hạ quyền root; role mới thuộc USER/ADMIN/SCANNER.'),
      ('4. Cập nhật quyền nguyên tử','Đổi role, tăng token_version để thu hồi phiên cũ của tài khoản đích.'),
      ('5. Ghi nhật ký','Lưu actor, user đích, vai trò cũ/mới và thời điểm.')],
      'ADMIN thông thường không được cấp quyền cho tài khoản khác.\nFrontend chỉ ẩn/hiện chức năng; API luôn kiểm tra lại quyền.')
    flow('chatbot_flow.png','Activity định tuyến câu hỏi chatbot',[
      ('1. Chuẩn hóa câu hỏi và lịch sử','Giới hạn kích thước, che email/chuỗi số cá nhân và chống spam.'),
      ('2. Phân loại ý định','Đơn/vé/trận/giá lấy dữ liệu cấu trúc; câu hỏi CLB/tin/đội hình cần tri thức.'),
      ('3. Truy xuất bằng chứng','PostgreSQL và tài liệu SLNAFC/VPF; chỉ dùng lịch sử khi là câu hỏi tiếp nối.'),
      ('4. Chọn đường trả lời','Dữ liệu giao dịch: trả deterministic. Nội dung tổng hợp: Gemini với evidence.'),
      ('5. Kiểm tra đầu ra','Không bịa danh sách hoặc thời điểm; nguồn phải HTTPS, allowlist và liên quan.'),
      ('6. Trả lời hoặc fallback','Trả ngắn gọn đúng trọng tâm; lỗi Gemini dùng phương án an toàn, nêu giới hạn.')],
      'Gemini hỗ trợ diễn đạt và tổng hợp, không thay thế nguồn sự thật.\nCâu hỏi “cầu thủ hiện tại” chỉ trả danh sách khi có bằng chứng đủ mới và đầy đủ.')
    flow('source_sync_flow.png','Activity đồng bộ nguồn tri thức chính thức',[
      ('1. Chọn nguồn đang bật','SLNAFC và VPF; hostname nằm trong allowlist.'),
      ('2. Tải tài liệu có kiểm soát','HTTPS, timeout, giới hạn kích thước và redirect.'),
      ('3. Làm sạch nội dung','Loại script/style; lấy tiêu đề, ngày, ảnh và nội dung chính.'),
      ('4. Chuẩn hóa và băm','Canonical URL, khoảng trắng, category và content_hash.'),
      ('5. Upsert PostgreSQL','Chỉ cập nhật tài liệu thay đổi; giữ metadata nguồn và fetched_at.'),
      ('6. Ghi trạng thái đồng bộ','Thành công hoặc lỗi theo từng nguồn; dữ liệu cũ không bị xóa vì lỗi tạm thời.')],
      'Nguồn mới không được tự động tin cậy chỉ vì người dùng gửi URL.\nAdmin phải phê duyệt domain, mục đích và lịch đồng bộ.')
    flow('image_upload_flow.png','Activity upload và xử lý logo an toàn',[
      ('1. Nhận multipart trong bộ nhớ','Giới hạn 5 MB; không dùng tên file từ client để tạo đường dẫn.'),
      ('2. Kiểm tra định dạng thật','Đối chiếu MIME khai báo với magic bytes và decoder ảnh.'),
      ('3. Chuẩn hóa bằng Sharp','Sửa orientation, giới hạn kích thước và xuất định dạng phù hợp.'),
      ('4. Tách nền sáng có điều kiện','Chỉ làm trong suốt vùng sáng liên thông với mép đối với loại logo.'),
      ('5. Lưu và cập nhật DB','Tên ngẫu nhiên phía server; lưu URL/key sau khi ghi file thành công.'),
      ('6. Phục vụ ảnh','Demo dùng uploads; production đề xuất object storage + CDN.')],
      'Thuật toán không xóa mọi màu trắng nên giữ chi tiết trắng nằm trong biểu tượng.\nFile sai hoặc xử lý lỗi bị từ chối và không tạo bản ghi mồ côi.')


if __name__ == '__main__':
    make_figures()
    print(ROOT)
