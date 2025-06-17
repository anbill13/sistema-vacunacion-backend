-- Crear la base de datos
CREATE DATABASE SistemaVacunacion;
GO

USE SistemaVacunacion;
GO

-- Crear tablas en orden correcto para respetar dependencias

-- 1. Centros_Vacunacion (no depende de otras tablas)
CREATE TABLE Centros_Vacunacion (
    id_centro UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre_centro NVARCHAR(100) NOT NULL,
    nombre_corto NVARCHAR(50),
    direccion NVARCHAR(200),
    latitud DECIMAL(9,6),
    longitud DECIMAL(9,6),
    telefono NVARCHAR(20),
    director NVARCHAR(100),
    sitio_web NVARCHAR(200),
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2 DEFAULT SYSDATETIME()
);
GO

-- 2. Vacunas (no depende de otras tablas)
CREATE TABLE Vacunas (
    id_vacuna UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre_vacuna NVARCHAR(100) NOT NULL,
    fabricante NVARCHAR(100),
    tipo_vacuna NVARCHAR(50),
    descripcion NVARCHAR(500),
    dosis_totales_requeridas INT CHECK (dosis_totales_requeridas > 0),
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2 DEFAULT SYSDATETIME()
);
GO

-- 3. Ni�os (depende de Centros_Vacunacion)
CREATE TABLE Ni�os (
    id_ni�o UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre_completo NVARCHAR(100) NOT NULL,
    identificacion NVARCHAR(50) UNIQUE,
    nacionalidad NVARCHAR(20) CHECK (nacionalidad IN ('Dominicano', 'Extranjero')),
    pais_nacimiento NVARCHAR(50),
    fecha_nacimiento DATE NOT NULL,
    genero CHAR(1) NOT NULL CHECK (genero IN ('M', 'F', 'O')),
    direccion_residencia NVARCHAR(200),
    latitud DECIMAL(9,6),
    longitud DECIMAL(9,6),
    id_centro_salud UNIQUEIDENTIFIER,
    contacto_principal NVARCHAR(20) CHECK (contacto_principal IN ('Madre', 'Padre', 'Tutor')),
    id_salud_nacional NVARCHAR(50),
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (id_centro_salud) REFERENCES Centros_Vacunacion(id_centro)
);
GO

-- 4. Tutores (depende de Ni�os)
CREATE TABLE Tutores (
    id_tutor UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_ni�o UNIQUEIDENTIFIER NOT NULL,
    nombre NVARCHAR(100) NOT NULL,
    identificacion NVARCHAR(50),
    relacion NVARCHAR(20) CHECK (relacion IN ('Madre', 'Padre', 'Tutor Legal')),
    telefono NVARCHAR(20),
    email NVARCHAR(100),
    direccion NVARCHAR(200),
    nacionalidad NVARCHAR(20) CHECK (nacionalidad IN ('Dominicano', 'Extranjero')),
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (id_ni�o) REFERENCES Ni�os(id_ni�o)
);
GO

-- 5. Lotes_Vacunas (depende de Vacunas y Centros_Vacunacion)
CREATE TABLE Lotes_Vacunas (
    id_lote UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_vacuna UNIQUEIDENTIFIER NOT NULL,
    numero_lote NVARCHAR(50) NOT NULL,
    fecha_vencimiento DATE,
    cantidad_total INT NOT NULL CHECK (cantidad_total >= 0),
    cantidad_disponible INT NOT NULL CHECK (cantidad_disponible >= 0),
    id_centro UNIQUEIDENTIFIER NOT NULL,
    temperatura_registrada DECIMAL(5,2),
    fecha_ultima_verificacion DATETIME2,
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (id_vacuna) REFERENCES Vacunas(id_vacuna),
    FOREIGN KEY (id_centro) REFERENCES Centros_Vacunacion(id_centro)
);
GO

-- 6. Personal_Salud (depende de Centros_Vacunacion)
CREATE TABLE Personal_Salud (
    id_personal UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre NVARCHAR(100) NOT NULL,
    cedula NVARCHAR(20) UNIQUE,
    telefono NVARCHAR(20),
    email NVARCHAR(100),
    id_centro UNIQUEIDENTIFIER NOT NULL,
    especialidad NVARCHAR(50),
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (id_centro) REFERENCES Centros_Vacunacion(id_centro)
);
GO

-- 7. Usuarios (depende de Centros_Vacunacion)
CREATE TABLE Usuarios (
    id_usuario UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre NVARCHAR(100) NOT NULL,
    rol NVARCHAR(20) NOT NULL CHECK (rol IN ('doctor', 'director', 'responsable', 'administrador')),
    id_centro UNIQUEIDENTIFIER,
    username NVARCHAR(50) NOT NULL UNIQUE,
    password_hash NVARCHAR(256) NOT NULL,
    email NVARCHAR(100),
    telefono NVARCHAR(20),
    estado NVARCHAR(20) NOT NULL CHECK (estado IN ('Activo', 'Inactivo')),
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (id_centro) REFERENCES Centros_Vacunacion(id_centro)
);
GO

-- 8. Campa�as_Vacunacion (depende de Vacunas)
CREATE TABLE Campa�as_Vacunacion (
    id_campa�a UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre_campa�a NVARCHAR(100) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    objetivo NVARCHAR(500),
    id_vacuna UNIQUEIDENTIFIER NOT NULL,
    estado NVARCHAR(20) NOT NULL CHECK (estado IN ('Planificada', 'En Curso', 'Finalizada')),
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (id_vacuna) REFERENCES Vacunas(id_vacuna)
);
GO

-- 9. Campa�a_Centro (depende de Campa�as_Vacunacion y Centros_Vacunacion)
CREATE TABLE Campa�a_Centro (
    id_campa�a_centro UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_campa�a UNIQUEIDENTIFIER NOT NULL,
    id_centro UNIQUEIDENTIFIER NOT NULL,
    fecha_asignacion DATE NOT NULL,
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (id_campa�a) REFERENCES Campa�as_Vacunacion(id_campa�a),
    FOREIGN KEY (id_centro) REFERENCES Centros_Vacunacion(id_centro)
);
GO

-- 10. Citas (depende de Ni�os, Centros_Vacunacion, y Campa�as_Vacunacion)
CREATE TABLE Citas (
    id_cita UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_ni�o UNIQUEIDENTIFIER NOT NULL,
    id_centro UNIQUEIDENTIFIER NOT NULL,
    id_campa�a UNIQUEIDENTIFIER,
    fecha_cita DATETIME2 NOT NULL,
    estado NVARCHAR(20) NOT NULL CHECK (estado IN ('Pendiente', 'Confirmada', 'Cancelada', 'Completada')),
    vacuna_programada NVARCHAR(100),
    observaciones NVARCHAR(500),
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (id_ni�o) REFERENCES Ni�os(id_ni�o),
    FOREIGN KEY (id_centro) REFERENCES Centros_Vacunacion(id_centro),
    FOREIGN KEY (id_campa�a) REFERENCES Campa�as_Vacunacion(id_campa�a)
);
GO

-- 11. Historial_Vacunacion (depende de Ni�os, Centros_Vacunacion, Vacunas, Lotes_Vacunas, Citas, Campa�as_Vacunacion, Personal_Salud)
CREATE TABLE Historial_Vacunacion (
    id_historial UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_ni�o UNIQUEIDENTIFIER NOT NULL,
    id_centro UNIQUEIDENTIFIER NOT NULL,
    id_vacuna UNIQUEIDENTIFIER NOT NULL,
    id_lote UNIQUEIDENTIFIER NOT NULL,
    id_cita UNIQUEIDENTIFIER,
    id_campa�a UNIQUEIDENTIFIER,
    fecha_aplicacion DATE NOT NULL,
    tipo_dosis NVARCHAR(20) NOT NULL,
    edad_al_vacunarse INT,
    id_personal_responsable UNIQUEIDENTIFIER NOT NULL,
    firma_digital NVARCHAR(200),
    observaciones NVARCHAR(500),
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (id_ni�o) REFERENCES Ni�os(id_ni�o),
    FOREIGN KEY (id_centro) REFERENCES Centros_Vacunacion(id_centro),
    FOREIGN KEY (id_vacuna) REFERENCES Vacunas(id_vacuna),
    FOREIGN KEY (id_lote) REFERENCES Lotes_Vacunas(id_lote),
    FOREIGN KEY (id_cita) REFERENCES Citas(id_cita),
    FOREIGN KEY (id_campa�a) REFERENCES Campa�as_Vacunacion(id_campa�a),
    FOREIGN KEY (id_personal_responsable) REFERENCES Personal_Salud(id_personal)
);
GO

-- 12. Inventario_Suministros (depende de Centros_Vacunacion)
CREATE TABLE Inventario_Suministros (
    id_suministro UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre_suministro NVARCHAR(100) NOT NULL,
    tipo_suministro NVARCHAR(50),
    cantidad_total INT NOT NULL CHECK (cantidad_total >= 0),
    cantidad_disponible INT NOT NULL CHECK (cantidad_disponible >= 0),
    id_centro UNIQUEIDENTIFIER NOT NULL,
    fecha_entrada DATE NOT NULL,
    fecha_vencimiento DATE,
    proveedor NVARCHAR(100),
    condiciones_almacenamiento NVARCHAR(200),
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (id_centro) REFERENCES Centros_Vacunacion(id_centro)
);
GO

-- 13. Suministro_Vacunacion (depende de Historial_Vacunacion e Inventario_Suministros)
CREATE TABLE Suministro_Vacunacion (
    id_suministro_vacunacion UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_historial UNIQUEIDENTIFIER NOT NULL,
    id_suministro UNIQUEIDENTIFIER NOT NULL,
    cantidad_usada INT NOT NULL CHECK (cantidad_usada > 0),
    fecha_uso DATE NOT NULL,
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (id_historial) REFERENCES Historial_Vacunacion(id_historial),
    FOREIGN KEY (id_suministro) REFERENCES Inventario_Suministros(id_suministro)
);
GO

-- 14. Esquema_Vacunacion (depende de Vacunas)
CREATE TABLE Esquema_Vacunacion (
    id_esquema UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_vacuna UNIQUEIDENTIFIER NOT NULL,
    orden_dosis INT NOT NULL CHECK (orden_dosis > 0),
    edad_recomendada NVARCHAR(50),
    intervalo_desde_anterior INT,
    descripcion NVARCHAR(500),
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (id_vacuna) REFERENCES Vacunas(id_vacuna)
);
GO

-- 15. Auditoria (depende de Usuarios)
CREATE TABLE Auditoria (
    id_auditoria UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tabla_afectada NVARCHAR(50) NOT NULL,
    id_registro UNIQUEIDENTIFIER NOT NULL,
    id_usuario UNIQUEIDENTIFIER NOT NULL,
    accion NVARCHAR(20) NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
    detalles NVARCHAR(500),
    ip_origen NVARCHAR(50),
    fecha_hora DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario)
);
GO

-- 16. Eventos_Adversos (depende de Ni�os, Historial_Vacunacion, Personal_Salud)
CREATE TABLE Eventos_Adversos (
    id_evento UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_ni�o UNIQUEIDENTIFIER NOT NULL,
    id_historial UNIQUEIDENTIFIER NOT NULL,
    descripcion_evento NVARCHAR(500) NOT NULL,
    fecha_evento DATE NOT NULL,
    gravedad NVARCHAR(20) NOT NULL CHECK (gravedad IN ('Leve', 'Moderado', 'Grave')),
    id_personal_reportante UNIQUEIDENTIFIER NOT NULL,
    acciones_tomadas NVARCHAR(500),
    estado NVARCHAR(20) NOT NULL CHECK (estado IN ('Reportado', 'En Investigaci�n', 'Resuelto')),
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (id_ni�o) REFERENCES Ni�os(id_ni�o),
    FOREIGN KEY (id_historial) REFERENCES Historial_Vacunacion(id_historial),
    FOREIGN KEY (id_personal_reportante) REFERENCES Personal_Salud(id_personal)
);
GO

-- 17. Alertas (depende de Ni�os, Eventos_Adversos, Usuarios)
CREATE TABLE Alertas (
    id_alerta UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_ni�o UNIQUEIDENTIFIER NOT NULL,
    id_evento UNIQUEIDENTIFIER,
    tipo_alerta NVARCHAR(20) NOT NULL CHECK (tipo_alerta IN ('Pr�xima Dosis', 'Esquema Incompleto', 'Fuera de Tiempo', 'Evento Adverso')),
    fecha_alerta DATE NOT NULL,
    mensaje NVARCHAR(500),
    estado NVARCHAR(20) NOT NULL CHECK (estado IN ('Pendiente', 'Resuelta', 'Ignorada')),
    id_usuario_asignado UNIQUEIDENTIFIER,
    fecha_resolucion DATETIME2,
    fecha_creacion DATETIME2 DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2 DEFAULT SYSDATETIME(),
    FOREIGN KEY (id_ni�o) REFERENCES Ni�os(id_ni�o),
    FOREIGN KEY (id_evento) REFERENCES Eventos_Adversos(id_evento),
    FOREIGN KEY (id_usuario_asignado) REFERENCES Usuarios(id_usuario)
);
GO