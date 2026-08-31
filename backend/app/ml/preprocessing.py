import numpy as np

def extract_features(event: dict) -> np.ndarray:
    sp = event.get('source_port', 0) / 65535.0
    dp = event.get('destination_port', 0) / 65535.0
    
    protocol = event.get('protocol', '').upper()
    proto_enc = 0
    if protocol == 'TCP': proto_enc = 0
    elif protocol == 'UDP': proto_enc = 1
    elif protocol == 'ICMP': proto_enc = 2
    else: proto_enc = 3
    
    bs = np.log1p(event.get('bytes_sent', 0))
    br = np.log1p(event.get('bytes_received', 0))
    dur = np.log1p(event.get('duration_ms', 0))
    
    bytes_ratio = event.get('bytes_sent', 0) / (event.get('bytes_received', 0) + 1)
    
    dst_port = event.get('destination_port', 0)
    risk_score = 0.1
    if dst_port == 22: risk_score = 0.7
    elif dst_port == 3389: risk_score = 0.8
    elif dst_port == 445: risk_score = 0.9
    elif dst_port == 21: risk_score = 0.6
    elif dst_port == 23: risk_score = 0.95
    
    import ipaddress
    def is_private(ip):
        try: return 1 if ipaddress.ip_address(ip).is_private else 0
        except: return 0
        
    priv_src = is_private(event.get('source_ip', ''))
    priv_dst = is_private(event.get('destination_ip', ''))
    
    flags = event.get('flags', '') or ''
    flag_syn = 1 if 'SYN' in flags else 0
    flag_rst = 1 if 'RST' in flags else 0
    flag_fin = 1 if 'FIN' in flags else 0
    
    high_port = 1 if dst_port > 49152 else 0
    
    b_sent = event.get('bytes_sent', 0)
    b_recv = event.get('bytes_received', 0)
    small_pkt = 1 if b_sent < 100 and b_recv < 100 else 0
    large_pkt = 1 if b_sent > 10000 or b_recv > 10000 else 0
    
    rep_att = min(event.get('repeated_attempts', 0) / 10.0, 1.0)
    
    hour = event.get('hour', 12)
    unusual_hr = 1 if hour in [0,1,2,3,4,5] else 0
    
    port_scan_ind = 1 if dst_port < 1024 and b_sent < 200 else 0
    
    asym = abs(b_sent - b_recv) / (b_sent + b_recv + 1)
    
    return np.array([[
        sp, dp, proto_enc, bs, br, dur, bytes_ratio, risk_score, priv_src, priv_dst,
        flag_syn, flag_rst, flag_fin, high_port, small_pkt, large_pkt, rep_att,
        unusual_hr, port_scan_ind, asym
    ]])

def preprocess_batch(events: list[dict]) -> np.ndarray:
    return np.vstack([extract_features(e) for e in events])
