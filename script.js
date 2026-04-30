document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();

    // ==============================================================================
    // KONFIGURASI GOOGLE SHEET
    // ==============================================================================
    // 1. Buka Google Spreadsheet Anda
    // 2. Klik File > Bagikan > Publikasikan ke web (File > Share > Publish to web)
    // 3. Pilih "Seluruh Dokumen" atau nama Sheet, dan ganti "Halaman Web" menjadi "Nilai yang dipisahkan koma (.csv)"
    // 4. Klik Publikasikan, copy URL yang muncul, dan paste di bawah ini:
    
    const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1kVXzcTVvyn5uuv8hQBM3LQ58TNKEh7S4MeFTvomJ1SM/export?format=csv"; 
    
    // ==============================================================================

    const donorsContainer = document.getElementById('donors-container');
    const totalAmountEl = document.getElementById('total-amount');
    const searchInput = document.getElementById('search-input');
    
    let allDonors = [];

    // Fungsi untuk memformat angka menjadi Rupiah
    const formatRupiah = (angka) => {
        return new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(angka);
    };

    // Fungsi untuk membuat inisial avatar
    const getInitials = (name) => {
        if (!name) return '?';
        const words = name.trim().split(' ');
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return words[0].substring(0, 2).toUpperCase();
    };

    // Fungsi untuk membersihkan dan memparsing nominal ke angka
    const parseNominal = (nominalStr) => {
        if (!nominalStr) return 0;
        // Hapus karakter non-digit (seperti Rp, titik, koma)
        const cleanStr = String(nominalStr).replace(/[^0-9]/g, '');
        return parseInt(cleanStr, 10) || 0;
    };

    // Render daftar donatur
    const renderDonors = (donors) => {
        donorsContainer.innerHTML = '';
        
        if (donors.length === 0) {
            donorsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 1rem; color: var(--text-secondary);"></i>
                    <p>Tidak ada data alumni ditemukan.</p>
                </div>
            `;
            return;
        }

        donors.forEach(donor => {
            // Pastikan tidak merender baris kosong
            if (!donor.nama && !donor.nominal) return;
            
            const nominalAmount = parseNominal(donor.nominal);
            
            const row = document.createElement('div');
            row.className = 'donor-row';
            
            row.innerHTML = `
                <div class="donor-info">
                    <div class="avatar">${getInitials(donor.nama || 'Hamba Allah')}</div>
                    <div class="col-name">${donor.nama || 'Hamba Allah'}</div>
                </div>
                <div class="col-date">${donor.tgl || '-'}</div>
                <div class="col-amount">Rp ${formatRupiah(nominalAmount)}</div>
            `;
            
            donorsContainer.appendChild(row);
        });
    };

    // Menghitung dan merender total donasi, dengan animasi angka naik
    const renderTotal = (donors) => {
        const total = donors.reduce((sum, donor) => sum + parseNominal(donor.nominal), 0);
        
        // Animasi counter
        let startTimestamp = null;
        const duration = 1500; // 1.5 detik
        
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            // Easing function (easeOutExpo)
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            
            const currentTotal = Math.floor(easeProgress * total);
            totalAmountEl.textContent = formatRupiah(currentTotal);
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                totalAmountEl.textContent = formatRupiah(total);
            }
        };
        
        window.requestAnimationFrame(step);
    };

    // Filter pencarian
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredDonors = allDonors.filter(donor => {
            const name = (donor.nama || '').toLowerCase();
            return name.includes(searchTerm);
        });
        renderDonors(filteredDonors);
    });

    // Main fetch function
    const loadData = () => {
        // Jika URL kosong, gunakan data dummy untuk keperluan demo/preview
        const fetchUrl = GOOGLE_SHEET_CSV_URL ? GOOGLE_SHEET_CSV_URL : null;
        
        if (!fetchUrl) {
            console.log("URL CSV belum disetel, menampilkan data dummy.");
            const dummyData = [
                { nama: "H. Abdullah", tgl: "10 Okt 2026", nominal: "500000" },
                { nama: "Keluarga Ibu Siti", tgl: "11 Okt 2026", nominal: "1000000" },
                { nama: "Hamba Allah", tgl: "12 Okt 2026", nominal: "250000" },
                { nama: "Budi Santoso", tgl: "12 Okt 2026", nominal: "300000" },
                { nama: "Majelis Taklim Al-Ikhlas", tgl: "13 Okt 2026", nominal: "1500000" }
            ];
            allDonors = dummyData;
            renderDonors(allDonors);
            renderTotal(allDonors);
            
            // Tambahkan banner peringatan untuk user
            const warningEl = document.createElement('div');
            warningEl.style.cssText = "background: rgba(245, 158, 11, 0.2); border: 1px solid var(--accent-color); padding: 10px; margin-bottom: 20px; border-radius: 10px; text-align: center; color: var(--accent-color);";
            warningEl.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> <b>Mode Demo:</b> URL Google Sheet CSV belum disetel di script.js. Menampilkan data contoh.";
            document.querySelector('header').appendChild(warningEl);
            return;
        }

        // Parsing CSV dari Google Sheets menggunakan PapaParse
        Papa.parse(fetchUrl, {
            download: true,
            header: true,
            skipEmptyLines: true,
            // Transformasi header menjadi huruf kecil semua untuk mencegah masalah case-sensitive (Nama vs nama)
            transformHeader: function(header) {
                return header.trim().toLowerCase();
            },
            complete: function(results) {
                if (results.errors.length > 0) {
                    console.error("Error parsing CSV:", results.errors);
                    donorsContainer.innerHTML = `
                        <div class="error-state">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            <p>Gagal memuat data. Periksa kembali URL Spreadsheet Anda.</p>
                        </div>
                    `;
                    return;
                }
                
                // Pastikan data valid (minimal memiliki field nama atau nominal)
                allDonors = results.data.filter(row => row.nama || row.nominal);
                
                renderDonors(allDonors);
                renderTotal(allDonors);
            },
            error: function(error) {
                console.error("Network Error:", error);
                donorsContainer.innerHTML = `
                    <div class="error-state">
                        <i class="fa-solid fa-wifi"></i>
                        <p>Kesalahan jaringan. Gagal terhubung ke Google Sheets.</p>
                    </div>
                `;
            }
        });
    };

    // Jalankan pemuatan data
    loadData();
});

// Fungsi untuk menyalin nomor rekening
function copyToClipboard(elementId, container) {
    const textToCopy = document.getElementById(elementId).innerText;
    
    // Copy ke clipboard
    navigator.clipboard.writeText(textToCopy).then(() => {
        // Efek visual klik
        const icon = container.querySelector('.copy-icon');
        const originalClass = icon.className;
        
        icon.className = 'fa-solid fa-check copy-icon';
        icon.style.color = 'var(--success-color)';
        
        setTimeout(() => {
            icon.className = originalClass;
            icon.style.color = '';
        }, 1500);
        
    }).catch(err => {
        console.error('Gagal menyalin teks: ', err);
    });
}
