package com.example.admin;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.Observer;
import androidx.lifecycle.ViewModelProvider;
import androidx.navigation.NavController;
import androidx.navigation.Navigation;

import com.example.admin.R;
import com.example.admin.login.AuthViewModel;
import com.google.firebase.auth.FirebaseUser;

public class Login extends AppCompatActivity {

    private AuthViewModel viewModel;
    private NavController navController;
    private EditText editEmail, editPass;
    private TextView signUpText;
    private Button signInBtn;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        viewModel = new ViewModelProvider(this, ViewModelProvider.AndroidViewModelFactory
                .getInstance(getApplication())).get(AuthViewModel.class);

        navController = Navigation.findNavController(this, R.id.nav_host_fragment);
        editEmail = findViewById(R.id.editEmailUp);
        editPass = findViewById(R.id.editPassUp);
        signUpText = findViewById(R.id.textView);
        signInBtn = findViewById(R.id.btnSignIn);



        signInBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String email = editEmail.getText().toString();
                String pass = editPass.getText().toString();
                if (!email.isEmpty() && !pass.isEmpty()) {
                    // Kiểm tra đuôi email có phải là @newhope.com không
                    if (email.endsWith("@newhope.com")) {
                        viewModel.signIn(email, pass);
                        viewModel.getFirebaseUserMutableLiveData().observe(Login.this, new Observer<FirebaseUser>() {
                            @Override
                            public void onChanged(FirebaseUser firebaseUser) {
                                if (firebaseUser != null) {
                                    // Đăng nhập thành công
                                    Toast.makeText(Login.this, "Login Successfully", Toast.LENGTH_SHORT).show();

                                    // Lưu trạng thái đăng nhập
                                    SharedPreferences sharedPreferences = getSharedPreferences("user_pref", Context.MODE_PRIVATE);
                                    SharedPreferences.Editor editor = sharedPreferences.edit();
                                    editor.putBoolean("isLoggedIn", true);
                                    editor.apply();

                                    // Chuyển sang DrawerActivity
                                    Intent intent = new Intent(Login.this, Drawer.class);
                                    startActivity(intent);
                                    finish();
                                } else {
                                    // Đăng nhập thất bại
                                    Toast.makeText(Login.this, "Incorrect email or password", Toast.LENGTH_SHORT).show();
                                }
                            }
                        });
                    } else {
                        // Email không hợp lệ
                        Toast.makeText(Login.this, "Only @newhope.com accounts are allowed", Toast.LENGTH_SHORT).show();
                    }
                } else {
                    Toast.makeText(Login.this, "Please Enter Email and Pass", Toast.LENGTH_SHORT).show();
                }
            }

        });

    }
}
