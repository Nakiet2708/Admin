package com.example.admin;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ListView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.QueryDocumentSnapshot;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.StorageReference;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends AppCompatActivity {
    EditText edtdifficulty, edtimage, edtquestions, edttitle;
    Button btnthem, btnsua, btnxoa, btnxem, btnChonHinh;
    private static final int PICK_IMAGE_REQUEST = 1;

    ListView lv;
    ArrayList<String> arrayList = new ArrayList<>();
    ArrayAdapter adapter;
    FirebaseFirestore db = FirebaseFirestore.getInstance();

    // Biến lưu trữ ID của tài liệu Firestore được chọn
    String selectedDocumentId = "";
    // Biến lưu trữ danh sách các QueryDocumentSnapshot
    ArrayList<QueryDocumentSnapshot> documentSnapshots = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        edtdifficulty = findViewById(R.id.edtdifficulty);
        edtimage = findViewById(R.id.edtimage);
        edtquestions = findViewById(R.id.edtquestions);
        edttitle = findViewById(R.id.edttitle);
        btnthem = findViewById(R.id.btnthem);
        btnsua = findViewById(R.id.btnsua);
        btnxoa = findViewById(R.id.btnxoa);
        btnxem = findViewById(R.id.btnxem);
        btnChonHinh = findViewById(R.id.btnChonHinh);
        btnChonHinh.setOnClickListener(view -> openFileChooser());

        lv = findViewById(R.id.lv);

        adapter = new ArrayAdapter<>(this, android.R.layout.simple_list_item_1, arrayList);
        lv.setAdapter(adapter);

        btnxem.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // Hiển thị dữ liệu từ Firestore trên ListView
                db.collection("Test")
                        .get()
                        .addOnCompleteListener(task -> {
                            if (task.isSuccessful()) {
                                arrayList.clear();
                                documentSnapshots.clear();
                                for (QueryDocumentSnapshot document : task.getResult()) {
                                    documentSnapshots.add(document);
                                    String item = "Chủ đề: " + document.getString("ChuDe") + "\n" +
                                            "Độ khó: " + document.getString("DoKho") + "\n" +
                                            "Số câu hỏi: " + document.getLong("SoCauHoi") + "\n" +
                                            "Hình: " + document.getString("Hinh");
                                    arrayList.add(item);
                                }
                                adapter.notifyDataSetChanged();
                            } else {
                                Toast.makeText(MainActivity.this, "Lỗi khi đọc dữ liệu", Toast.LENGTH_SHORT).show();
                            }
                        });
            }
        });

        btnthem.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                // Thêm dữ liệu vào Firestore
                String DoKho = edtdifficulty.getText().toString();
                String Hinh = edtimage.getText().toString();
                int SoCauHoi = Integer.parseInt(edtquestions.getText().toString());
                String ChuDe = edttitle.getText().toString();
                Map<String, Object> user = new HashMap<>();
                user.put("DoKho", DoKho);
                user.put("Hinh", Hinh);
                user.put("SoCauHoi", SoCauHoi);
                user.put("ChuDe", ChuDe);
                db.collection("Test")
                        .add(user)
                        .addOnSuccessListener(new OnSuccessListener<DocumentReference>() {
                            @Override
                            public void onSuccess(DocumentReference documentReference) {
                                Toast.makeText(MainActivity.this, "Thêm thành công", Toast.LENGTH_SHORT).show();
                            }
                        })
                        .addOnFailureListener(new OnFailureListener() {
                            @Override
                            public void onFailure(@NonNull Exception e) {
                                Toast.makeText(MainActivity.this, "Thêm thất bại", Toast.LENGTH_SHORT).show();
                            }
                        });
            }
        });

        btnsua.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                // Kiểm tra xem đã chọn một tài liệu để sửa chưa
                if (!selectedDocumentId.isEmpty()) {
                    // Lấy nội dung mới từ EditText
                    String DoKho = edtdifficulty.getText().toString();
                    String Hinh = edtimage.getText().toString();
                    int SoCauHoi = Integer.parseInt(edtquestions.getText().toString());
                    String ChuDe = edttitle.getText().toString();

                    // Tạo Map để cập nhật dữ liệu
                    Map<String, Object> updatedData = new HashMap<>();
                    updatedData.put("DoKho", DoKho);
                    updatedData.put("Hinh", Hinh);
                    updatedData.put("SoCauHoi", SoCauHoi);
                    updatedData.put("ChuDe", ChuDe);

                    // Cập nhật dữ liệu trên Firestore
                    db.collection("Test")
                            .document(selectedDocumentId)
                            .update(updatedData)
                            .addOnSuccessListener(new OnSuccessListener<Void>() {
                                @Override
                                public void onSuccess(Void aVoid) {
                                    Toast.makeText(MainActivity.this, "Cập nhật thành công", Toast.LENGTH_SHORT).show();
                                    // Sau khi cập nhật thành công, đặt lại giá trị của selectedDocumentId để chuẩn bị cho việc sửa tiếp theo
                                    selectedDocumentId = "";
                                }
                            })
                            .addOnFailureListener(new OnFailureListener() {
                                @Override
                                public void onFailure(@NonNull Exception e) {
                                    Toast.makeText(MainActivity.this, "Cập nhật thất bại", Toast.LENGTH_SHORT).show();
                                }
                            });
                } else {
                    Toast.makeText(MainActivity.this, "Vui lòng chọn một mục để sửa", Toast.LENGTH_SHORT).show();
                }
            }
        });

        btnxoa.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                // Kiểm tra xem đã chọn một tài liệu để xóa chưa
                if (!selectedDocumentId.isEmpty()) {
                    // Xóa dữ liệu trên Firestore
                    db.collection("Test")
                            .document(selectedDocumentId)
                            .delete()
                            .addOnSuccessListener(new OnSuccessListener<Void>() {
                                @Override
                                public void onSuccess(Void aVoid) {
                                    Toast.makeText(MainActivity.this, "Xóa thành công", Toast.LENGTH_SHORT).show();
                                    // Sau khi xóa thành công, đặt lại giá trị của selectedDocumentId để chuẩn bị cho việc xóa tiếp theo
                                    selectedDocumentId = "";
                                }
                            })
                            .addOnFailureListener(new OnFailureListener() {
                                @Override
                                public void onFailure(@NonNull Exception e) {
                                    Toast.makeText(MainActivity.this, "Xóa thất bại", Toast.LENGTH_SHORT).show();
                                }
                            });
                } else {
                    Toast.makeText(MainActivity.this, "Vui lòng chọn một mục để xóa", Toast.LENGTH_SHORT).show();
                }
            }
        });

        lv.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            @Override
            public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
                // Lấy QueryDocumentSnapshot tương ứng với vị trí được chọn
                QueryDocumentSnapshot documentSnapshot = documentSnapshots.get(position);

                // Lấy document ID từ QueryDocumentSnapshot
                String selectedDocumentId = documentSnapshot.getId();

                // Lấy dữ liệu từ QueryDocumentSnapshot
                String doKho = documentSnapshot.getString("DoKho");
                String hinh = documentSnapshot.getString("Hinh");
                int soCauHoi = documentSnapshot.getLong("SoCauHoi").intValue();
                String chuDe = documentSnapshot.getString("ChuDe");

                // Hiển thị thông tin lên EditText tương ứng
                edtdifficulty.setText(doKho);
                edtimage.setText(hinh);
                edtquestions.setText(String.valueOf(soCauHoi));
                edttitle.setText(chuDe);

                // Đặt lại selectedDocumentId để sử dụng cho việc sửa hoặc xóa
                MainActivity.this.selectedDocumentId = selectedDocumentId;
            }
        });
    }

    // Hàm mở bộ chọn hình ảnh
    private void openFileChooser() {
        Intent intent = new Intent();
        intent.setType("image/*");
        intent.setAction(Intent.ACTION_GET_CONTENT);
        startActivityForResult(intent, PICK_IMAGE_REQUEST);
    }

    // Hàm xử lý dữ liệu trả về từ bộ chọn hình ảnh
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == PICK_IMAGE_REQUEST && resultCode == Activity.RESULT_OK
                && data != null && data.getData() != null) {
            Uri imageUri = data.getData();

            // Tạo một đối tượng StorageReference, xác định vị trí lưu trữ trên Firebase
            String fileName = getFileName(imageUri);
            StorageReference storageRef = FirebaseStorage.getInstance().getReference().child("images/" + fileName);

            // Kiểm tra xem edtimage có null hay không
            if (edtimage != null) {
                // Tải hình ảnh lên Firebase Storage
                storageRef.putFile(imageUri)
                        .addOnSuccessListener(taskSnapshot -> {
                            // Lấy URL của hình ảnh sau khi đã được tải lên
                            storageRef.getDownloadUrl().addOnSuccessListener(uri -> {
                                // Hiển thị URL của hình ảnh trên EditText
                                edtimage.setText(uri.toString());
                            });
                        })
                        .addOnFailureListener(e -> {
                            // Xử lý khi có lỗi xảy ra trong quá trình tải hình ảnh lên Storage
                            Toast.makeText(MainActivity.this, "Lỗi khi tải hình ảnh lên Storage: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                        });
            }
        }
    }

    // Hàm lấy tên hình ảnh từ Uri
    private String getFileName(Uri uri) {
        String result = null;
        if (uri.getScheme().equals("content")) {
            Cursor cursor = getContentResolver().query(uri, null, null, null, null);
            try {
                if (cursor != null && cursor.moveToFirst()) {
                    result = cursor.getString(cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME));
                }
            } finally {
                cursor.close();
            }
        }
        if (result == null) {
            result = uri.getPath();
            int cut = result.lastIndexOf('/');
            if (cut != -1) {
                result = result.substring(cut + 1);
            }
        }
        return result;
    }
}
