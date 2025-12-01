// التحقق من دعم التعرف الصوتي
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    document.getElementById('status').textContent = '❌ المتصفح لا يدعم التعرف الصوتي';
    document.getElementById('voiceBtn').disabled = true;
}

const recognition = SpeechRecognition ? new SpeechRecognition() : null;
if (recognition) {
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = false;
}

let isListening = false;
const voiceBtn = document.getElementById('voiceBtn');
const status = document.getElementById('status');
const productNameInput = document.getElementById('productName');
const productPriceInput = document.getElementById('productPrice');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const productDropdown = document.getElementById('productDropdown');
const productActions = document.getElementById('productActions');
const deleteProductBtn = document.getElementById('deleteProductBtn');

// بدء/إيقاف التسجيل
voiceBtn.addEventListener('click', () => {
    if (!recognition) return;

    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
        voiceBtn.classList.add('listening');
        status.textContent = '🎤 استمع... تحدث الآن';
        isListening = true;
    }
});

// معالجة النتائج
if (recognition) {
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        status.textContent = `تم الاستماع: ${transcript}`;
        
        // محاولة البحث عن منتج موجود
        const products = getProducts();
        const foundProduct = products.find(p => 
            transcript.includes(p.name) || p.name.includes(transcript)
        );

        if (foundProduct) {
            // عرض المنتج الموجود
            productNameInput.value = foundProduct.name;
            productPriceInput.value = foundProduct.price;
            showToast(`✅ تم العثور على: ${foundProduct.name}`);
        } else {
            // استخراج اسم المنتج والسعر
            parseVoiceInput(transcript);
        }
    };

    recognition.onend = () => {
        voiceBtn.classList.remove('listening');
        isListening = false;
        if (status.textContent === '🎤 استمع... تحدث الآن') {
            status.textContent = 'اضغط على الميكروفون للبدء';
        }
    };

    recognition.onerror = (event) => {
        status.textContent = '❌ حدث خطأ في التعرف الصوتي';
        voiceBtn.classList.remove('listening');
        isListening = false;
    };
}

// تحليل الإدخال الصوتي
function parseVoiceInput(text) {
    // البحث عن الأرقام في النص
    const priceMatch = text.match(/\d+\.?\d*/);
    
    // استخراج السعر
    if (priceMatch) {
        productPriceInput.value = priceMatch[0];
        
        // استخراج اسم المنتج (كل شيء قبل الرقم)
        const priceIndex = text.indexOf(priceMatch[0]);
        let productName = text.substring(0, priceIndex).trim();
        
        // إزالة الكلمات المتعلقة بالسعر من النهاية
        productName = productName
            .replace(/\s*(ب|بسعر|سعر|ريال|جنيه|درهم|دينار|دولار)\s*$/g, '')
            .trim();
        
        if (productName) {
            productNameInput.value = productName;
        }
    } else {
        // إذا لم يكن هناك رقم، استخدم النص كاملاً كاسم منتج
        productNameInput.value = text.trim();
    }
}

// حفظ المنتج
saveBtn.addEventListener('click', () => {
    const name = productNameInput.value.trim();
    const price = productPriceInput.value.trim();

    if (!name || !price) {
        showToast('⚠️ يرجى إدخال الاسم والسعر');
        return;
    }

    const product = {
        id: Date.now(),
        name: name,
        price: parseFloat(price),
        date: new Date().toISOString()
    };

    const products = getProducts();
    products.push(product);
    saveProducts(products);

    showToast('✅ تم حفظ المنتج بنجاح');
    clearInputs();
    displayProducts();
});

// مسح الحقول
clearBtn.addEventListener('click', clearInputs);

function clearInputs() {
    productNameInput.value = '';
    productPriceInput.value = '';
    status.textContent = 'اضغط على الميكروفون للبدء';
}

// الحصول على المنتجات
function getProducts() {
    const data = localStorage.getItem('products');
    return data ? JSON.parse(data) : [];
}

// حفظ المنتجات
function saveProducts(products) {
    localStorage.setItem('products', JSON.stringify(products));
}

// عرض المنتجات
function displayProducts() {
    let products = getProducts();

    // الترتيب حسب الاسم
    products.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    // إعادة تعيين القائمة
    productDropdown.innerHTML = '<option value="">اختر مادة...</option>';
    
    if (products.length === 0) {
        productDropdown.innerHTML += '<option disabled>لا توجد مواد محفوظة</option>';
        productActions.style.display = 'none';
        return;
    }

    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} - ${product.price}`;
        productDropdown.appendChild(option);
    });
}

// التعامل مع اختيار منتج من القائمة
productDropdown.addEventListener('change', function() {
    const selectedId = parseInt(this.value);
    
    if (!selectedId) {
        productActions.style.display = 'none';
        return;
    }

    const products = getProducts();
    const product = products.find(p => p.id === selectedId);
    
    if (product) {
        productNameInput.value = product.name;
        productPriceInput.value = product.price;
        productActions.style.display = 'flex';
        showToast('تم تحميل المادة للتعديل');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

// حذف المنتج المحدد
deleteProductBtn.addEventListener('click', function() {
    const selectedId = parseInt(productDropdown.value);
    
    if (!selectedId) return;
    
    if (confirm('هل أنت متأكد من حذف هذه المادة؟')) {
        let products = getProducts();
        products = products.filter(p => p.id !== selectedId);
        saveProducts(products);
        
        // مسح الحقول
        clearInputs();
        
        // إخفاء زر الحذف
        productActions.style.display = 'none';
        
        // تحديث القائمة
        displayProducts();
        
        showToast('تم حذف المادة');
    }
});

// إظهار رسالة توست
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// عرض المنتجات عند التحميل
displayProducts();